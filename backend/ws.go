package main

import (
	"backend/db"
	"backend/service"
	t "backend/types"
	"backend/utils"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/lithammer/shortuuid/v4"
	"github.com/pion/rtp"
	"github.com/pion/webrtc/v3"
	"nhooyr.io/websocket"
	"nhooyr.io/websocket/wsjson"
)

type roomTrack struct {
	pID   string
	track *webrtc.TrackLocalStaticRTP
}

type socketRoom struct {
	conns        map[*websocket.Conn]struct{}
	lastActivity time.Time
	tracks       map[string]*roomTrack
}

type socketConn struct {
	pID  string
	peer *Peer
}

type socketServer struct {
	bot          *t.User
	conns        map[*websocket.Conn]*socketConn
	participants map[string]*t.Participant
	users        map[int][]string
	rooms        map[int]*socketRoom
	repo         *db.Repo
	emojis       map[string]struct{}
	svc          *service.Service
	cfg          *t.Config
	aiMsgRequest chan *t.AIMessageRequest
	webrtcAPI    *webrtc.API
}

func newSocketServer(repo *db.Repo, svc *service.Service, webrtcAPI *webrtc.API, cfg *t.Config, bot *t.User, emojis map[string]struct{}) *socketServer {
	return &socketServer{
		conns:        make(map[*websocket.Conn]*socketConn),
		rooms:        make(map[int]*socketRoom),
		participants: make(map[string]*t.Participant),
		users:        make(map[int][]string),
		emojis:       emojis,
		repo:         repo,
		svc:          svc,
		cfg:          cfg,
		// TODO: learn about the buffered channel
		aiMsgRequest: make(chan *t.AIMessageRequest, 1000),
		bot:          bot,
		webrtcAPI:    webrtcAPI,
	}
}

func (s *socketServer) accept(conn *websocket.Conn, user *t.User) {
	p := &t.Participant{
		SID:      shortuuid.New(),
		Status:   "None",
		JoinedAt: time.Now().UTC(),
	}

	if user != nil {
		p.User = *user

		if _, ok := s.users[user.ID]; !ok {
			s.users[user.ID] = []string{p.SID}
		} else {
			s.users[user.ID] = append(s.users[user.ID], p.SID)
		}
	}

	s.conns[conn] = &socketConn{
		pID: p.SID,
	}
	s.participants[p.SID] = p
}

func (s *socketServer) close(conn *websocket.Conn, roomID int, user *t.User) {
	delete(s.conns, conn)
	s.leaveRoom(conn, user, roomID)
}

func (s *socketServer) isInRoom(conn *websocket.Conn, roomID int) bool {
	if _, ok := s.rooms[roomID]; ok {
		_, ok := s.rooms[roomID].conns[conn]
		return ok
	}
	return false
}

func (s *socketServer) leaveRoom(conn *websocket.Conn, user *t.User, roomID int) {
	room, ok := s.rooms[roomID]
	if !ok {
		return
	}
	if _, ok := room.conns[conn]; !ok {
		return
	}

	// remove participants from users map
	if _, ok := s.users[user.ID]; ok {
		s.users[user.ID] = utils.Filter(s.users[user.ID], func(val string) bool {
			c := s.conns[conn]
			if c != nil {
				return val != c.pID
			}
			return false
		})

		if len(s.users[user.ID]) == 0 {
			delete(s.users, user.ID)
		}
	}

	delete(room.conns, conn)
	room.lastActivity = time.Now().UTC()

	s.broadcastEvent(&t.Event{
		Name: "LEFT_ROOM_BROADCAST",
		Data: map[string]any{
			"roomID": roomID,
			"user":   user,
		},
	})
}

func (s *socketServer) broadcastEvent(event *t.Event) {
	for conn := range s.conns {
		utils.WriteEvent(conn, event)
	}
}

func (s *socketServer) broadcastMsgEvent(userIDs []int, event *t.Event) {
	var sIDs []string
	for u, ids := range s.users {
		if utils.Includes(userIDs, u) {
			sIDs = append(sIDs, ids...)
		}
	}

	for conn, val := range s.conns {
		if utils.Includes(sIDs, val.pID) {
			utils.WriteEvent(conn, event)
		}
	}
}

func (s *socketServer) broadcastRoomEvent(roomID int, event *t.Event) {
	r, ok := s.rooms[roomID]
	if !ok {
		log.Printf("broadcast to room failed, room not found: %d", roomID)
		return
	}

	for conn := range r.conns {
		utils.WriteEvent(conn, event)
	}
}

func (s *socketServer) getParticipantsInRoom(roomID int) []*t.Participant {
	participants := make([]*t.Participant, 0)
	if _, ok := s.rooms[roomID]; ok {
		for conn := range s.rooms[roomID].conns {
			if val, ok := s.conns[conn]; ok {
				participants = append(participants, s.participants[val.pID])
			}
		}
	}

	sort.Slice(participants, func(i, j int) bool {
		return participants[i].JoinedAt.Before(participants[j].JoinedAt)
	})

	return participants
}

func (s *socketServer) joinRoomHandler(conn *websocket.Conn, b []byte) (int, error) {
	data, err := utils.ParseJSON[t.JoinRoom](b)
	if err != nil {
		return 0, err
	}

	room, ok := s.rooms[data.RoomID]
	if !ok {
		return 0, errors.New("room doesn't exist")
	}
	if _, ok := room.conns[conn]; ok {
		return 0, errors.New("joined room already")
	}

	r, err := s.repo.GetRoom(context.Background(), data.RoomID)
	if err != nil {
		return 0, err
	}

	if len(s.rooms[data.RoomID].conns) >= r.MaxParticipants {
		return 0, errors.New("max participants limit reached")
	}

	p, err := s.NewPeer(data.RoomID, conn)
	if err != nil {
		return 0, fmt.Errorf("failed to create peer: %v", err)
	}

	s.conns[conn].peer = p
	room.conns[conn] = struct{}{}
	room.lastActivity = time.Now().UTC()

	p.OnTrack(func(tr *webrtc.TrackRemote, r *webrtc.RTPReceiver) {
		// NOTE:: to prevent empty track/stream id
		time.Sleep(time.Second * 2)
		log.Printf("Received track: Track ID: %q, Stream ID: %q", tr.ID(), tr.StreamID())

		track, err := s.addTrack(data.RoomID, conn, tr)
		if err != nil {
			log.Printf("failed to add track: %v", err)
			return
		}
		defer s.removeTrack(data.RoomID, tr.ID())

		buf := make([]byte, 1500)
		rtpPkt := &rtp.Packet{}

		for {
			i, _, err := tr.Read(buf)
			if err != nil {
				log.Printf("failed to read remote track: %v", err)
				return
			}

			if err = rtpPkt.Unmarshal(buf[:i]); err != nil {
				log.Printf("failed to unmarshal rtp packet: %v", err)
				return
			}
			rtpPkt.Extension = false
			rtpPkt.Extensions = nil

			if err = track.WriteRTP(rtpPkt); err != nil {
				log.Printf("failed to write rtp packet: %v", err)
				return
			}
		}
	})

	streamMap := make(map[string]string)
	for _, t := range s.rooms[data.RoomID].tracks {
		if _, err := p.AddTrack(t.track); err != nil {
			log.Printf("failed to add track to new peer: %v", err)
			continue
		}
		streamMap[t.pID] = t.track.StreamID()
	}

	utils.WriteEvent(conn, &t.Event{
		Name: "PEER_STREAMS",
		Data: map[string]any{
			"roomID":  data.RoomID,
			"streams": streamMap,
		},
	})

	err = p.makeOffer()
	if err != nil {
		log.Printf("failed to make offer: %v", err)
	}

	p.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		log.Printf("connection state: %v", state)
		switch state {
		case webrtc.PeerConnectionStateFailed:
			if err := p.Close(); err != nil {
				log.Printf("failed to close failed peer connection: %v", err)
			}
		}
	})

	s.broadcastEvent(&t.Event{
		Name: "JOINED_ROOM_BROADCAST",
		Data: map[string]any{
			"roomID": data.RoomID,
			"user":   s.getParticipant(conn).User,
			"sid":    s.conns[conn].pID,
			"key":    data.Key,
		},
	})

	return r.ID, nil
}

func (s *socketServer) newMessageHandler(conn *websocket.Conn, b []byte) {
	data, err := utils.ParseJSON[t.NewMessage](b)
	if err != nil {
		log.Printf("failed to unmarshal NEW_MESSAGE data: %v", err)
		return
	}

	msgType := utils.GetMsgType(data.RoomID, data.ParticipantID)
	if msgType == t.UnknowMsg {
		log.Printf("new message event: unknown msg type")
		return
	}

	ok, err := utils.ValidateContent(&data.Content)
	if !ok {
		log.Printf("message content validation failed: %v", err)
		return
	}

	if (msgType == t.RoomMsg || msgType == t.PrivateRoomMsg) &&
		!s.participantsInRoom(conn, *data.RoomID, data.ParticipantID) {
		return
	}

	p := s.getParticipant(conn)
	msg := s.createMessage(
		&p.User,
		msgType,
		data,
	)

	var (
		isAIMsgReq bool
		aiReply    string
	)

	if msgType == t.DMMsg {
		mID, err := s.svc.CreateMessage(context.Background(), msg, p.ID, *data.ParticipantID)
		msg.ID = mID
		if err != nil {
			log.Printf("new message event: failed to create message: %v", err)
			return
		}
	} else {
		isAIMsgReq = utils.IsAIMsgReq(&msg.Content)
		if data.ReplyTo != nil {
			var err error
			aiReply, err = s.repo.IsReplyToAI(context.Background(), *data.RoomID, *data.ReplyTo)
			if err != nil {
				log.Printf("new message event: failed to check if reply is from ai: %v", err)
				return
			}
			if len(aiReply) != 0 {
				isAIMsgReq = true
			}
		}
	}

	event := &t.Event{
		Name: "NEW_MESSAGE_BROADCAST",
		Data: msg,
	}

	if msgType == t.RoomMsg {
		s.broadcastRoomEvent(*data.RoomID, event)
	} else {
		pIDs := []int{p.ID, *data.ParticipantID}
		s.broadcastMsgEvent(pIDs, event)
	}

	if isAIMsgReq {
		s.aiMsgRequest <- &t.AIMessageRequest{
			MsgType:    msgType,
			NewMessage: data,
			MsgID:      msg.ID,
			From:       p.ID,
			AIReply:    aiReply,
		}
	}
}

func (s *socketServer) participantsInRoom(conn *websocket.Conn, roomID int, participantID *int) bool {
	if !s.isInRoom(conn, roomID) {
		return false
	}
	if participantID == nil {
		return true
	}
	_, ok := s.users[*participantID]
	return ok
}

func (s *socketServer) editMessageHandler(conn *websocket.Conn, b []byte) {
	data, err := utils.ParseJSON[t.EditMessage](b)
	if err != nil {
		log.Printf("failed to unmarshal EDIT_MESSAGE data: %v", err)
		return
	}

	msgType := utils.GetMsgType(data.RoomID, data.ParticipantID)
	if msgType == t.UnknowMsg {
		log.Printf("edit message event: unknown msg type")
		return
	}

	ok, err := utils.ValidateContent(&data.Content)
	if !ok {
		log.Printf("edit message event: message content validation failed: %v", err)
		return
	}

	if (msgType == t.RoomMsg || msgType == t.PrivateRoomMsg) &&
		!s.participantsInRoom(conn, *data.RoomID, data.ParticipantID) {
	}

	p := s.getParticipant(conn)
	if msgType == t.DMMsg {
		err := s.svc.EditMessage(context.Background(), data.ID, data.Content, p.ID, *data.ParticipantID)
		if err != nil {
			log.Printf("edit message event: failed to edit message: %v", err)
			return
		}
	}

	event := t.Event{
		Name: "EDIT_MESSAGE_BROADCAST",
		Data: s.createMsgData(map[string]any{
			"id":      data.ID,
			"content": data.Content,
			"from":    p.User,
		}, msgType, data.RoomID, data.ParticipantID),
	}

	if msgType == t.RoomMsg {
		s.broadcastRoomEvent(*data.RoomID, &event)
	} else {
		pIDs := []int{p.ID, *data.ParticipantID}
		s.broadcastMsgEvent(pIDs, &event)
	}
}

func (s *socketServer) reactionToMsgHandler(conn *websocket.Conn, b []byte) {
	data, err := utils.ParseJSON[t.ReactionToMessage](b)
	if err != nil {
		log.Printf("failed to unmarshal REACTION_TO_MESSAGE data: %v", err)
		return
	}

	msgType := utils.GetMsgType(data.RoomID, data.ParticipantID)
	if msgType == t.UnknowMsg {
		log.Printf("reaction msg event: unknown msg type")
		return
	}

	if (msgType == t.RoomMsg || msgType == t.PrivateRoomMsg) &&
		!s.participantsInRoom(conn, *data.RoomID, data.ParticipantID) {
		return
	}

	if _, ok := s.emojis[data.Reaction]; !ok {
		log.Printf("emoji not supported: %q", data.Reaction)
		return
	}

	p := s.getParticipant(conn)
	if msgType == t.DMMsg {
		err := s.svc.ReactionToMessage(context.Background(), data.ID, p.ID, *data.ParticipantID, data.Reaction)
		if err != nil {
			log.Printf("reaction msg event: failed to update message: %v", err)
			return
		}
	}

	event := t.Event{
		Name: "REACTION_TO_MESSAGE_BROADCAST",
		Data: s.createMsgData(map[string]any{
			"id":       data.ID,
			"reaction": data.Reaction,
			"from":     p.User,
		}, msgType, data.RoomID, data.ParticipantID),
	}

	if msgType == t.RoomMsg {
		s.broadcastRoomEvent(*data.RoomID, &event)
	} else {
		pIDs := []int{p.ID, *data.ParticipantID}
		s.broadcastMsgEvent(pIDs, &event)
	}
}

func (s *socketServer) clearChatHandler(conn *websocket.Conn, b []byte) {
	data, err := utils.ParseJSON[t.ClearChat](b)
	if err != nil {
		log.Printf("failed to unmarshal CLEAR_CHAT data: %v", err)
		return
	}

	ok := s.participantsInRoom(conn, data.RoomID, &data.ParticipantID)
	if !ok {
		log.Printf("clear chat event: participants not in room")
		return
	}

	p := s.getParticipant(conn)
	err = s.svc.CanClearChat(context.Background(), data.RoomID, p.ID, data.ParticipantID)
	if err != nil {
		log.Printf("failed to clear chat: %v", err)
		return
	}

	s.broadcastRoomEvent(data.RoomID, &t.Event{
		Name: "CLEAR_CHAT_BROADCAST",
		Data: map[string]any{
			"roomID":      data.RoomID,
			"participant": s.getUser(data.ParticipantID),
			"by":          p.User,
		},
	})
}

func (s *socketServer) assignRoleHandler(conn *websocket.Conn, b []byte) {
	data, err := utils.ParseJSON[t.AssignRole](b)
	if err != nil {
		log.Printf("failed to unmarshal ASSIGN_ROLE data: %v", err)
		return
	}

	ok := s.participantsInRoom(conn, data.RoomID, &data.ParticipantID)
	if !ok {
		log.Printf("assign role event: participants not in room")
		return
	}

	p := s.getParticipant(conn)
	err = s.svc.AssignRole(context.Background(), data.Role, data.RoomID, p.ID, data.ParticipantID)
	if err != nil {
		if errors.Is(err, service.ErrMaxRoomsHosted) {
			username := s.getUser(data.ParticipantID).Username
			msg := fmt.Sprintf("%s is already hosting %d rooms", username, s.cfg.MaxRoomsHosted)
			s.broadcastMsgEvent([]int{p.ID}, &t.Event{
				Name: "ERROR_BROADCAST",
				Data: map[string]any{
					"roomID":  data.RoomID,
					"title":   "Transfer Room",
					"content": msg,
				},
			})
		}
		log.Printf("failed to assign role: %v", err)
		return
	}

	s.broadcastRoomEvent(data.RoomID, &t.Event{
		Name: "ASSIGN_ROLE_BROADCAST",
		Data: map[string]any{
			"roomID":      data.RoomID,
			"by":          p.User,
			"role":        data.Role,
			"participant": s.getUser(data.ParticipantID),
		},
	})
}

func (s *socketServer) updateWelcomeMsgHandler(conn *websocket.Conn, b []byte) {
	data, err := utils.ParseJSON[t.UpdateWelcomeMessage](b)
	if err != nil {
		log.Printf("failed to unmarshal UPDATE_WELCOME_MESSAGE data: %v", err)
		return
	}

	ok, err := utils.ValidateWelcomeMsg(&data.WelcomeMessage)
	if !ok {
		log.Printf("welcome message validation failed: %v", err)
		return
	}

	if !s.isInRoom(conn, data.RoomID) {
		return
	}

	p := s.getParticipant(conn)
	err = s.svc.UpdateWelcomeMessage(context.Background(), data.RoomID, p.ID, data.WelcomeMessage)
	if err != nil {
		log.Printf("failed to update welcome message: %v", err)
	}

	s.broadcastRoomEvent(data.RoomID, &t.Event{
		Name: "UPDATE_WELCOME_MESSAGE_BROADCAST",
		Data: map[string]any{
			"by":             p.User,
			"welcomeMessage": data.WelcomeMessage,
			"roomID":         data.RoomID,
		},
	})
}

func (s *socketServer) setStatusHandler(conn *websocket.Conn, b []byte) {
	data, err := utils.ParseJSON[t.SetStatus](b)
	if err != nil {
		log.Printf("failed to unmarshal SET_STATUS data: %v", err)
		return
	}

	ok, err := utils.ValidateStatus(&data.Status)
	if !ok {
		log.Printf("set status event: validation failed: %v", err)
		return
	}

	if !s.isInRoom(conn, data.RoomID) {
		return
	}

	p := s.getParticipant(conn)
	p.Status = data.Status

	s.broadcastRoomEvent(data.RoomID, &t.Event{
		Name: "SET_STATUS_BROADCAST",
		Data: map[string]any{
			"roomID": data.RoomID,
			"status": data.Status,
			"by":     p.User,
		},
	})
}

func (s *socketServer) peerMuteHandler(conn *websocket.Conn, b []byte) {
	data, err := utils.ParseJSON[t.PeerMute](b)
	if err != nil {
		log.Printf("failed to unmarshal PEER_MUTE data: %v", err)
		return
	}

	if !s.isInRoom(conn, data.RoomID) {
		return
	}

	p := s.getParticipant(conn)
	s.broadcastRoomEvent(data.RoomID, &t.Event{
		Name: "PEER_MUTE_BROADCAST",
		Data: map[string]any{
			"roomID":        data.RoomID,
			"participantID": p.SID,
			"mute":          data.Mute,
		},
	})
}

func (s *socketServer) kickParticipantHandler(conn *websocket.Conn, b []byte) {
	data, err := utils.ParseJSON[t.KickParticipant](b)
	if err != nil {
		log.Printf("failed to unmarshal KICK_PARTICIPANT data: %v", err)
		return
	}

	duration, err := time.ParseDuration(data.Duration)
	if err != nil {
		log.Printf("kick participant event: invalid duration: %v", err)
		return
	}
	if duration.Seconds() < 60 {
		log.Printf("kick participant event: duration should be atleast 1 minute")
		return
	}

	ok := s.participantsInRoom(conn, data.RoomID, &data.ParticipantID)
	if !ok {
		log.Printf("kick participant event: participants not in room")
		return
	}

	p := s.getParticipant(conn)
	k, err := s.svc.KickParticipant(context.Background(), duration, data.RoomID, p.ID, data.ParticipantID)
	if err != nil {
		log.Printf("failed to kick participant: %v", err)
		return
	}

	d := map[string]any{
		"by":          p.User,
		"participant": s.getUser(data.ParticipantID),
		"roomID":      data.RoomID,
	}

	if data.ClearChat {
		s.broadcastRoomEvent(data.RoomID, &t.Event{
			Name: "CLEAR_CHAT_BROADCAST",
			Data: d,
		})
	}

	d["expiredAt"] = k.ExpiredAt
	s.broadcastRoomEvent(data.RoomID, &t.Event{
		Name: "KICK_PARTICIPANT_BROADCAST",
		Data: d,
	})

	sIDs := s.users[data.ParticipantID]
	for conn, val := range s.conns {
		if utils.Includes(sIDs, val.pID) {
			s.leaveRoom(conn, &s.participants[val.pID].User, data.RoomID)
		}
	}
}

func (s *socketServer) deleteMessageHandler(conn *websocket.Conn, b []byte) {
	data, err := utils.ParseJSON[t.DeleteMessage](b)
	if err != nil {
		log.Printf("failed to unmarshal DELETE_MESSAGE data: %v", err)
		return
	}

	msgType := utils.GetMsgType(data.RoomID, data.ParticipantID)
	if msgType == t.UnknowMsg {
		log.Printf("delete msg event: unknown msg type")
		return
	}

	if msgType == t.RoomMsg || msgType == t.PrivateRoomMsg {
		ok := s.participantsInRoom(conn, *data.RoomID, data.ParticipantID)
		if !ok {
			return
		}
	}

	p := s.getParticipant(conn)
	if msgType == t.DMMsg {
		err := s.svc.DeleteMessage(context.Background(), data.ID, p.ID, *data.ParticipantID)
		if err != nil {
			log.Printf("delete msg event: failed to delete message: %v", err)
			return
		}
	}

	event := t.Event{
		Name: "DELETE_MESSAGE_BROADCAST",
		Data: s.createMsgData(map[string]any{
			"id":   data.ID,
			"from": p.User,
		}, msgType, data.RoomID, data.ParticipantID),
	}

	if msgType == t.RoomMsg {
		s.broadcastRoomEvent(*data.RoomID, &event)
	} else {
		pIDs := []int{p.ID, *data.ParticipantID}
		s.broadcastMsgEvent(pIDs, &event)
	}
}

func (s *socketServer) populateRooms() error {
	rooms, err := s.repo.GetRooms(context.Background())
	if err != nil {
		return err
	}
	for _, r := range rooms {
		s.rooms[r.ID] = &socketRoom{
			lastActivity: time.Now().UTC(),
			conns:        make(map[*websocket.Conn]struct{}),
			tracks:       make(map[string]*roomTrack),
		}
	}
	return nil
}

func (s *socketServer) getParticipant(conn *websocket.Conn) *t.Participant {
	return s.participants[s.conns[conn].pID]
}

func (s *socketServer) getUser(userID int) *t.User {
	for u, participants := range s.users {
		if u == userID {
			pID := participants[0]
			return &s.participants[pID].User
		}
	}
	return nil
}

func (s *socketServer) createMsgData(d map[string]any, m t.MsgType, roomID, pID *int) *map[string]any {
	if m == t.RoomMsg || m == t.PrivateRoomMsg {
		d["roomID"] = *roomID
	}
	if m == t.DMMsg {
		d["participant"] = map[string]any{
			"id": *pID,
		}
	}
	return &d
}

func (s *socketServer) createMessage(user *t.User, m t.MsgType, d *t.NewMessage) *t.Message {
	msg := t.Message{
		Content:   d.Content,
		From:      *user,
		CreatedAt: time.Now().UTC(),
		ReplyTo:   d.ReplyTo,
	}

	if m == t.RoomMsg || m == t.PrivateRoomMsg {
		msg.ID = shortuuid.New()
		msg.RoomID = d.RoomID
	}

	if m == t.PrivateRoomMsg {
		msg.Participant = s.getUser(*d.ParticipantID)
	}

	if m == t.DMMsg {
		msg.Participant = &t.User{ID: *d.ParticipantID}
	}

	return &msg
}

func (s *socketServer) sendAIReply(req *t.AIMessageRequest) {
	reply, err := s.svc.GetReplyFromAI(*req.RoomID, req.From, req.Content, req.AIReply)
	if err != nil {
		log.Printf("failed to get reply from ai for msg %q: %v", req.Content, err)
		return
	}

	msg := s.createMessage(s.bot, req.MsgType, &t.NewMessage{
		Content:       reply,
		RoomID:        req.RoomID,
		ParticipantID: req.ParticipantID,
		ReplyTo:       &req.MsgID,
	})

	s.repo.SetAIReply(context.Background(), *req.RoomID, msg.ID, req.From, []string{req.Content, reply})

	event := &t.Event{
		Name: "NEW_MESSAGE_BROADCAST",
		Data: msg,
	}

	if req.MsgType == t.RoomMsg {
		s.broadcastRoomEvent(*req.RoomID, event)
	} else if req.MsgType == t.PrivateRoomMsg {
		pIDs := []int{req.From, *req.ParticipantID}
		s.broadcastMsgEvent(pIDs, event)
	}
}

func (s *socketServer) processAIMsgRequest() {
	for req := range s.aiMsgRequest {
		go s.sendAIReply(req)
	}
}

func (s *socketServer) addTrack(roomID int, conn *websocket.Conn, tr *webrtc.TrackRemote) (*webrtc.TrackLocalStaticRTP, error) {
	track, err := webrtc.NewTrackLocalStaticRTP(tr.Codec().RTPCodecCapability, tr.ID(), tr.StreamID())
	if err != nil {
		return nil, err
	}

	pID := s.conns[conn].pID
	s.rooms[roomID].tracks[tr.ID()] = &roomTrack{
		pID:   pID,
		track: track,
	}

	s.broadcastRoomEvent(roomID, &t.Event{
		Name: "PEER_STREAMS",
		Data: map[string]any{
			"roomID": roomID,
			"streams": map[string]string{
				pID: tr.StreamID(),
			},
		},
	})

	s.broadcastTracks(roomID, conn, track)

	return track, nil
}

func (s *socketServer) broadcastTracks(roomID int, c *websocket.Conn, tr *webrtc.TrackLocalStaticRTP) {
	for conn := range s.rooms[roomID].conns {
		if c == conn {
			continue
		}

		peer := s.conns[conn].peer
		if peer == nil {
			continue
		}

		_, err := peer.AddTrack(tr)
		if err != nil {
			log.Printf("broadcast tracks: failed to add track to peer: %v", err)
			continue
		}

		err = peer.makeOffer()
		if err != nil {
			log.Printf("broadcast tracks: failed to make offer: %v", err)
			continue
		}
	}
}

func (s *socketServer) removeTrack(roomID int, trackID string) {
	log.Println("removing track", trackID)
	delete(s.rooms[roomID].tracks, trackID)
}

func (s *socketServer) NewPeer(roomID int, conn *websocket.Conn) (*Peer, error) {
	p, err := s.webrtcAPI.NewPeerConnection(webrtc.Configuration{
		SDPSemantics: webrtc.SDPSemanticsUnifiedPlanWithFallback,
		ICEServers: []webrtc.ICEServer{
			{
				URLs: []string{
					"stun:stun.l.google.com:19302",
				},
			},
		},
	})
	if err != nil {
		return nil, err
	}

	peer := &Peer{
		roomID:         roomID,
		PeerConnection: p,
		conn:           conn,
	}

	_, err = peer.AddTransceiverFromKind(webrtc.RTPCodecTypeAudio, webrtc.RTPTransceiverInit{
		Direction: webrtc.RTPTransceiverDirectionRecvonly,
	})
	if err != nil {
		return nil, err
	}

	p.OnICECandidate(func(i *webrtc.ICECandidate) {
		if i == nil {
			return
		}

		b, err := json.Marshal(i.ToJSON())
		if err != nil {
			log.Printf("failed to marshal ice candidate: %v", err)
			return
		}

		utils.WriteEvent(conn, &t.Event{
			Name: "PEER_ICE_CANDIDATE",
			Data: map[string]any{
				"roomID":    roomID,
				"candidate": string(b),
			},
		})
	})

	return peer, nil
}

func (app *application) wsHandler(w http.ResponseWriter, r *http.Request) {
	host := strings.Split(app.conf.WebURL, "//")[1]
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{host},
	})
	if err != nil {
		log.Printf("failed to accept socket connection: %v", err)
		return
	}

	// last joined room
	var roomID int

	user, ok := r.Context().Value("user").(*t.User)
	if !ok {
		user = nil
	}

	defer func() {
		app.ss.close(conn, roomID, user)
		conn.CloseNow()
	}()

	app.ss.accept(conn, user)

	for {
		var event t.Event
		err := wsjson.Read(context.Background(), conn, &event)
		if err != nil {
			return
		}

		// only users who are authenticated can send event
		if user == nil {
			return
		}

		b, err := json.Marshal(event.Data)
		if err != nil {
			log.Printf("failed to marshal 'data' in event: %v", err)
			return
		}

		switch event.Name {
		case "JOIN_ROOM":
			roomID, err = app.ss.joinRoomHandler(conn, b)
			if err != nil {
				log.Printf("failed to join room: %v", err)
			}
		case "NEW_MESSAGE":
			app.ss.newMessageHandler(conn, b)
		case "EDIT_MESSAGE":
			app.ss.editMessageHandler(conn, b)
		case "DELETE_MESSAGE":
			app.ss.deleteMessageHandler(conn, b)
		case "REACTION_TO_MESSAGE":
			app.ss.reactionToMsgHandler(conn, b)
		case "CLEAR_CHAT":
			app.ss.clearChatHandler(conn, b)
		case "ASSIGN_ROLE":
			app.ss.assignRoleHandler(conn, b)
		case "UPDATE_WELCOME_MESSAGE":
			app.ss.updateWelcomeMsgHandler(conn, b)
		case "SET_STATUS":
			app.ss.setStatusHandler(conn, b)
		case "KICK_PARTICIPANT":
			app.ss.kickParticipantHandler(conn, b)
		case "PEER_ICE_CANDIDATE":
			if val, ok := app.ss.conns[conn]; ok && val != nil {
				val.peer.addICECandidate(b)
			}
		case "PEER_MUTE":
			app.ss.peerMuteHandler(conn, b)
		case "PEER_OFFER":
			if val, ok := app.ss.conns[conn]; ok && val.peer != nil {
				val.peer.acceptOffer(b)
			}
		case "PEER_ANSWER":
			if val, ok := app.ss.conns[conn]; ok && val.peer != nil {
				val.peer.acceptAnswer(b)
			}
		}
	}
}
