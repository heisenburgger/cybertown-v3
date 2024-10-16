package main

import "net/http"

func (app *application) router() http.Handler {
	router := http.NewServeMux()
	ensureAuthed := createStack(app.authMiddleware, app.isAuthenticated)
	core := createStack(app.loggingMiddleware)

	router.HandleFunc("GET /auth/google/callback", app.authCallbackHandler)
	router.Handle("DELETE /auth/logout", ensureAuthed(http.HandlerFunc(app.logoutHandler)))
	router.Handle("GET /me", ensureAuthed(http.HandlerFunc(app.meHandler)))
	router.Handle("PUT /me", ensureAuthed(http.HandlerFunc(app.updateMeHandler)))

	router.Handle("POST /rooms", ensureAuthed(http.HandlerFunc(app.createRoomHandler)))
	router.Handle("PUT /rooms/{roomID}", ensureAuthed(http.HandlerFunc(app.updateRoomHandler)))
	router.HandleFunc("GET /rooms", app.getRoomsHandler)
	router.Handle("GET /rooms/{roomID}/join", ensureAuthed(http.HandlerFunc(app.joinRoomHandler)))

	router.Handle("GET /profile/{profileID}", app.authMiddleware(http.HandlerFunc(app.profileHandler)))
	router.Handle("POST /follow", ensureAuthed(http.HandlerFunc(app.followHandler(true))))
	router.Handle("DELETE /follow", ensureAuthed(http.HandlerFunc(app.followHandler(false))))
	router.Handle("GET /relations", ensureAuthed(http.HandlerFunc(app.getRelationsHandler)))
	router.Handle("GET /dms", ensureAuthed(http.HandlerFunc(app.getDMsHandler)))
	router.Handle("PUT /dms/{participantID}", ensureAuthed(http.HandlerFunc(app.updateDMsHandler)))
	router.Handle("POST /messages/{participantID}", ensureAuthed(http.HandlerFunc(app.getMessagesHandler)))
	router.Handle("GET /languages", http.HandlerFunc(app.getLanguagesHandler))

	v1 := http.NewServeMux()
	v1.Handle("/api/v1/", http.StripPrefix("/api/v1", core(router)))
	v1.Handle("/ws", app.authMiddleware(http.HandlerFunc(app.wsHandler)))

	return v1
}
