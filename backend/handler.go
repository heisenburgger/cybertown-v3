package main

import (
	t "backend/types"
	v "backend/validator"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"nhooyr.io/websocket"
)

func (app *application) authCallbackHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var (
		code = q.Get("code")
		s    = q.Get("state")
	)

	var state t.OAuthState
	err := json.Unmarshal([]byte(s), &state)
	if err != nil || !state.Validate(app.conf) {
		badRequest(w, err)
		return
	}

	t, err := app.svc.GetGoogleOAuthTokens(code)
	if err != nil {
		serverError(w, err)
		return
	}

	u, err := app.svc.GetGoogleOAuthUserInfo(t)
	if err != nil {
		serverError(w, err)
		return
	}

	userID, err := app.repo.CreateUser(context.Background(), u)
	if err != nil {
		serverError(w, err)
		return
	}

	expiredAt := time.Now().UTC().Add(app.conf.CookieExpiration)
	sessionID, err := app.repo.CreateSession(context.Background(), userID, expiredAt)
	if err != nil {
		serverError(w, err)
		return
	}

	cookie := &http.Cookie{
		Name:     "session",
		Value:    sessionID,
		Path:     "/",
		MaxAge:   int(app.conf.CookieExpiration.Seconds()),
		SameSite: http.SameSiteLaxMode,
		HttpOnly: true,
		Secure:   true,
	}

	http.SetCookie(w, cookie)
	http.Redirect(w, r, state.RedirectURL, http.StatusTemporaryRedirect)
}

func (app *application) meHandler(w http.ResponseWriter, r *http.Request) {
	u := r.Context().Value("user").(*t.User)
	data := map[string]any{
		"user": u,
	}
	jsonResponse(w, http.StatusOK, data)
}

func (app *application) logoutHandler(w http.ResponseWriter, r *http.Request) {
	u := r.Context().Value("user").(*t.User)

	c, err := r.Cookie("session")
	if err != nil {
		unauthRequest(w, nil)
		return
	}

	err = app.repo.DeleteSessionForUser(context.Background(), c.Value, u.ID)
	if err != nil {
		serverError(w, err)
		return
	}

	emptyCookie := http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		SameSite: http.SameSiteLaxMode,
		HttpOnly: true,
		Secure:   true,
	}

	http.SetCookie(w, &emptyCookie)
	msgResponse(w, "ok")
}

func (app *application) createRoomHandler(w http.ResponseWriter, r *http.Request) {
	var req t.CreateRoomRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		badRequest(w, err)
		return
	}

	ok, err := req.Validate()
	if !ok {
		badRequest(w, err)
		return
	}

	u := r.Context().Value("user").(*t.User)

	count, err := app.repo.CountRoomsHosted(context.Background(), u.ID)
	if err != nil {
		serverError(w, err)
		return
	}
	if count >= app.conf.MaxRoomsHosted {
		errMsg := fmt.Sprintf("Can't host more than %d rooms", app.conf.MaxRoomsHosted)
		errorsResponse(w, http.StatusForbidden, map[string]any{
			"reason": errMsg,
		})
		return
	}

	roomID, err := app.repo.CreateRoom(context.Background(), &t.Room{
		Topic:           req.Topic,
		MaxParticipants: req.MaxParticipants,
		Languages:       req.Languages,
		CreatedBy:       u.ID,
	})

	if err != nil {
		serverError(w, err)
		return
	}

	go func(roomID int) {
		app.ss.rooms[roomID] = &socketRoom{
			lastActivity: time.Now().UTC(),
			conns:        make(map[*websocket.Conn]struct{}),
			tracks:       make(map[string]*roomTrack),
		}

		app.ss.broadcastEvent(&t.Event{
			Name: "NEW_ROOM_BROADCAST",
			Data: map[string]any{
				"roomID": roomID,
			},
		})
	}(roomID)

	jsonResponse(w, http.StatusOK, map[string]any{
		"roomID": roomID,
	})
}

func (app *application) getRoomsHandler(w http.ResponseWriter, _ *http.Request) {
	rooms, err := app.repo.GetRooms(context.Background())
	if err != nil {
		serverError(w, err)
		return
	}

	res := make([]*t.RoomsResponse, 0)
	for _, room := range rooms {
		roomRes := t.RoomsResponse{
			Room:         room,
			Participants: app.ss.getParticipantsInRoom(room.ID),
		}
		res = append(res, &roomRes)
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"rooms": res,
	})
}

func (app *application) joinRoomHandler(w http.ResponseWriter, r *http.Request) {
	roomID := r.PathValue("roomID")
	id, err := strconv.Atoi(roomID)
	if err != nil {
		notFoundError(w, err)
		return
	}

	u := r.Context().Value("user").(*t.User)
	room, err := app.repo.GetRoom(context.Background(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			notFoundError(w, err)
		} else {
			serverError(w, err)
		}
		return
	}

	participants := app.ss.getParticipantsInRoom(room.ID)
	if len(participants) >= room.MaxParticipants {
		badRequest(w, err)
		return
	}

	k, err := app.repo.GetKick(context.Background(), room.ID, u.ID)
	if nil == err {
		errorsResponse(w, http.StatusForbidden, map[string]any{
			"expiredAt": k.ExpiredAt,
		})
		return
	}

	roomRes := t.RoomsResponse{
		Room:         room,
		Participants: participants,
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"room": roomRes,
	})
}

func (app *application) updateRoomHandler(w http.ResponseWriter, r *http.Request) {
	roomID := r.PathValue("roomID")
	id, err := strconv.Atoi(roomID)
	if err != nil {
		badRequest(w, err)
		return
	}

	var req t.CreateRoomRequest // same payload for editing a room as well
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		badRequest(w, err)
		return
	}

	ok, err := req.Validate()
	if !ok {
		badRequest(w, err)
		return
	}

	u := r.Context().Value("user").(*t.User)
	room, err := app.repo.GetRoomForUser(context.Background(), id, u.ID)
	if err != nil {
		serverError(w, err)
		return
	}
	room.Topic = req.Topic
	room.MaxParticipants = req.MaxParticipants
	room.Languages = req.Languages

	err = app.repo.UpdateRoom(context.Background(), room)
	if err != nil {
		serverError(w, err)
		return
	}

	go func(roomID int) {
		app.ss.broadcastEvent(&t.Event{
			Name: "UPDATE_ROOM_BROADCAST",
			Data: map[string]any{
				"roomID": room.ID,
			},
		})
	}(room.ID)

	msgResponse(w, "ok")
}

func (app *application) followHandler(isFollow bool) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			FolloweeID int `json:"followeeID"`
		}

		err := json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			badRequest(w, err)
			return
		}

		u := r.Context().Value("user").(*t.User)
		if u.ID == req.FolloweeID {
			badRequest(w, nil)
			return
		}

		if isFollow {
			err = app.repo.Follow(context.Background(), u.ID, req.FolloweeID)
		} else {
			err = app.repo.Unfollow(context.Background(), u.ID, req.FolloweeID)
		}

		if err != nil {
			serverError(w, err)
			return
		}

		msgResponse(w, "ok")
	}
}

func (app *application) profileHandler(w http.ResponseWriter, r *http.Request) {
	profileID := r.PathValue("profileID")
	pID, err := strconv.Atoi(profileID)
	if err != nil {
		badRequest(w, err)
		return
	}

	var userID int
	u, ok := r.Context().Value("user").(*t.User)
	if ok {
		userID = u.ID
	}

	p, err := app.repo.GetProfile(context.Background(), userID, pID)
	if err != nil {
		serverError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"profile": p,
	})
}

func (app *application) getRelationsHandler(w http.ResponseWriter, r *http.Request) {
	relation := r.URL.Query().Get("relation")

	vd := v.NewValidator()
	vd.IsInStr("relation", &relation, []string{"following", "friends", "followers"})
	if !vd.IsValid() {
		badRequest(w, nil)
		return
	}

	u := r.Context().Value("user").(*t.User)
	users, err := app.repo.GetRelations(context.Background(), u.ID, t.Relation(relation))
	if err != nil {
		serverError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"users": users,
	})
}

func (app *application) getDMsHandler(w http.ResponseWriter, r *http.Request) {
	u := r.Context().Value("user").(*t.User)
	dms, err := app.repo.GetDMs(context.Background(), u.ID)
	if err != nil {
		serverError(w, err)
		return
	}
	jsonResponse(w, http.StatusOK, map[string]any{
		"dms": dms,
	})
}

func (app *application) updateDMsHandler(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("participantID")
	pID, err := strconv.Atoi(id)
	if err != nil {
		badRequest(w, err)
		return
	}
	u := r.Context().Value("user").(*t.User)
	err = app.repo.UpdateDMs(context.Background(), u.ID, pID)
	if err != nil {
		serverError(w, err)
		return
	}
	msgResponse(w, "ok")
}

func (app *application) getMessagesHandler(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("participantID")
	pID, err := strconv.Atoi(id)
	if err != nil {
		badRequest(w, err)
		return
	}

	var req struct {
		Cursor *time.Time
	}
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		badRequest(w, nil)
		return
	}

	u := r.Context().Value("user").(*t.User)
	messages, err := app.repo.GetMessages(context.Background(), u.ID, pID, req.Cursor)
	if err != nil {
		serverError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"messages": messages,
	})
}

func (app *application) getLanguagesHandler(w http.ResponseWriter, _ *http.Request) {
	jsonResponse(w, http.StatusOK, map[string]any{
		"languages": t.AllowedLanguages,
	})
}

func (app *application) updateMeHandler(w http.ResponseWriter, r *http.Request) {
	var req t.UpdateMeRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		badRequest(w, err)
		return
	}

	ok, err := req.Validate()
	if !ok {
		badRequest(w, err)
		return
	}

	u := r.Context().Value("user").(*t.User)
	err = app.repo.UpdateUser(context.Background(), u.ID, req.Bio)
	if err != nil {
		serverError(w, err)
		return
	}

	msgResponse(w, "ok")
}
