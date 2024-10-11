package types

type Event struct {
	Name string `json:"name"`
	Data any    `json:"data"`
}

type JoinRoom struct {
	RoomID int    `json:"roomID"`
	Key    string `json:"key"`
}

type LeaveRoom struct {
	RoomID int `json:"roomID"`
}

type NewMessage struct {
	RoomID        *int    `json:"roomID"`
	Content       string  `json:"content"`
	ReplyTo       *string `json:"replyTo"`
	ParticipantID *int    `json:"participantID"`
}

type EditMessage struct {
	ID            string `json:"id"`
	Content       string `json:"content"`
	RoomID        *int   `json:"roomID"`
	ParticipantID *int   `json:"participantID"`
}

type DeleteMessage struct {
	ID            string `json:"id"`
	RoomID        *int   `json:"roomID"`
	ParticipantID *int   `json:"participantID"`
}

type ReactionToMessage struct {
	ID            string `json:"id"`
	Reaction      string `json:"reaction"`
	ParticipantID *int   `json:"participantID"`
	RoomID        *int   `json:"roomID"`
}

type ClearChat struct {
	ParticipantID int `json:"participantId"`
	RoomID        int `json:"roomID"`
}

type AssignRole struct {
	Role          RoomRole `json:"role"`
	ParticipantID int      `json:"participantId"`
	RoomID        int      `json:"roomID"`
}

type UpdateWelcomeMessage struct {
	RoomID         int    `json:"roomID"`
	WelcomeMessage string `json:"welcomeMessage"`
}

type SetStatus struct {
	RoomID int    `json:"roomID"`
	Status string `json:"status"`
}

type KickParticipant struct {
	RoomID        int    `json:"roomID"`
	ParticipantID int    `json:"participantID"`
	Duration      string `json:"duration"`
	ClearChat     bool   `json:"clearChat"`
}

type ICECandiate struct {
	RoomID    int    `json:"roomID"`
	Candidate string `json:"candidate"`
}

type PeerOffer struct {
	RoomID int    `json:"roomID"`
	Offer  string `json:"offer"`
}

type PeerAnswer struct {
	RoomID int    `json:"roomID"`
	Answer string `json:"answer"`
}

type PeerMute struct {
	RoomID int  `json:"roomID"`
	Mute   bool `json:"mute"`
}

type AIMessageRequest struct {
	*NewMessage
	From    int
	MsgType MsgType
	MsgID   string
	AIReply string
}
