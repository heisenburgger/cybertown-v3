package main

import (
	t "backend/types"
	"backend/utils"
	"encoding/json"
	"log"

	"github.com/pion/webrtc/v4"
	"nhooyr.io/websocket"
)

type Peer struct {
	roomID int
	conn   *websocket.Conn
	*webrtc.PeerConnection
}

func (p *Peer) sendAnswer() error {
	answer, err := p.CreateAnswer(nil)
	if err != nil {
		return err
	}
	err = p.SetLocalDescription(answer)
	if err != nil {
		return err
	}

	b, err := json.Marshal(answer)
	if err != nil {
		return err
	}

	utils.WriteEvent(p.conn, &t.Event{
		Name: "PEER_ANSWER",
		Data: map[string]any{
			"answer": string(b),
			"roomID": p.roomID,
		},
	})
	return nil
}

func (p *Peer) makeOffer() error {
	offer, err := p.CreateOffer(nil)
	if err != nil {
		return err
	}
	err = p.SetLocalDescription(offer)
	if err != nil {
		return err
	}

	b, err := json.Marshal(offer)
	if err != nil {
		return err
	}

	utils.WriteEvent(p.conn, &t.Event{
		Name: "PEER_OFFER",
		Data: map[string]any{
			"offer":  string(b),
			"roomID": p.roomID,
		},
	})
	return nil
}

func (p *Peer) addICECandidate(b []byte) {
	data, err := utils.ParseJSON[t.ICECandiate](b)
	if err != nil {
		log.Printf("ice candidate event: failed to parse: %v", err)
		return
	}

	var i webrtc.ICECandidateInit
	err = json.Unmarshal([]byte(data.Candidate), &i)
	if err != nil {
		log.Printf("ice candidate event: failed to unmarshal ice candidate: %v", err)
		return
	}

	err = p.AddICECandidate(i)
	if err != nil {
		log.Printf("ice candidate event: failed to add ice candidate: %v", err)
		return
	}

	log.Println("added ice candidate")
}

func (p *Peer) acceptOffer(b []byte) {
	data, err := utils.ParseJSON[t.PeerOffer](b)
	if err != nil {
		log.Printf("peer offer event: failed to parse data: %v", err)
		return
	}

	var d webrtc.SessionDescription
	err = json.Unmarshal([]byte(data.Offer), &d)
	if err != nil {
		log.Printf("peer offer event: failed to unmarshal offer: %v", err)
		return
	}

	err = p.SetRemoteDescription(d)
	if err != nil {
		log.Printf("peer answer event: failed to set remote desc: %v", err)
		return
	}

	err = p.sendAnswer()
	if err != nil {
		log.Printf("peer answer event: failed to send answer: %v", err)
		return
	}

	log.Println("accepted offer")
}

func (p *Peer) acceptAnswer(b []byte) {
	data, err := utils.ParseJSON[t.PeerAnswer](b)
	if err != nil {
		log.Printf("peer answer event: failed to parse data: %v", err)
		return
	}

	var d webrtc.SessionDescription
	err = json.Unmarshal([]byte(data.Answer), &d)
	if err != nil {
		log.Printf("peer answer event: failed to unmarshal answer: %v", err)
		return
	}

	err = p.SetRemoteDescription(d)
	if err != nil {
		log.Printf("peer answer event: failed to set remote desc: %v", err)
		return
	}
}
