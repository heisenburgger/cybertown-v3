package main

import (
	"backend/types"
	"backend/utils"
	"context"
	"fmt"
	"log"
	"net/http"
	"time"
)

type Middleware func(http.Handler) http.Handler

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (rec *statusRecorder) WriteHeader(code int) {
	rec.status = code
	rec.ResponseWriter.WriteHeader(code)
}

func createStack(xs ...Middleware) Middleware {
	return func(next http.Handler) http.Handler {
		for i := len(xs) - 1; i >= 0; i-- {
			x := xs[i]
			next = x(next)
		}
		return next
	}
}

func (app *application) enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("origin")

		if origin == app.conf.WebURL {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (app *application) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie("session")
		if err != nil || c.Value == "" {
			next.ServeHTTP(w, r)
			return
		}

		user, err := app.repo.GetUserFromSession(context.Background(), c.Value)
		if err != nil {
			log.Printf("failed to get user from session: %v\n", err)
			next.ServeHTTP(w, r)
			return
		}

		ctx := context.WithValue(r.Context(), "user", user)
		req := r.WithContext(ctx)
		next.ServeHTTP(w, req)
	})
}

func (app *application) isAuthenticated(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		v := r.Context().Value("user")

		if _, ok := v.(*types.User); !ok {
			unauthRequest(w, nil)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (app *application) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)
		log.Printf("path: %s, method: %s, status: %d, duration: %s",
			r.URL.Path,
			r.Method,
			recorder.status,
			time.Since(start),
		)
	})
}

func (app *application) maliciousIP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		forwarded := r.Header.Get("X-Forwarded-For")
		if forwarded != "" {
			ip = forwarded
		}

		if utils.Includes(app.ss.ips, ip) {
			log.Printf("ips that got banned: %v\n", app.ss.ips)
			forbiddenError(w, fmt.Errorf("banned ip: %s\n", ip))
			return
		}

		next.ServeHTTP(w, r)
	})
}
