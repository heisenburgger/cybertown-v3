package main

import (
	"backend/db"
	"backend/service"
	"backend/types"
	"backend/utils"
	"context"
	"log"
	"net/http"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
	"github.com/pion/webrtc/v3"
)

type application struct {
	repo *db.Repo
	svc  *service.Service
	conf *types.Config
	ss   *socketServer
}

func main() {
	godotenv.Load()

	var conf types.Config
	if err := env.Parse(&conf); err != nil {
		log.Fatalf("failed to parse config: %v", err)
	}

	pool := db.NewPool(conf.PostgresURL)
	defer pool.Close()

	rdb := db.NewRedisClient(conf.RedisURL)

	emojis, err := utils.GetEmojis()
	if err != nil {
		log.Fatalf("failed to fetch emojis: %v", err)
	}

	repo := db.NewRepo(pool, rdb, &conf)
	svc := service.NewService(&conf, repo)

	bot, err := repo.GetUserByName(context.Background(), "Cybertown Bot")
	if err != nil {
		log.Fatalf("failed to get bot: %v", err)
	}

	settingEngine := webrtc.SettingEngine{}
	settingEngine.SetAnsweringDTLSRole(webrtc.DTLSRoleServer)
	webrtcAPI := webrtc.NewAPI(webrtc.WithSettingEngine(settingEngine))

	app := application{
		repo: repo,
		svc:  svc,
		conf: &conf,
		ss:   newSocketServer(repo, svc, webrtcAPI, &conf, bot, emojis),
	}

	server := http.Server{
		Addr:    ":6969",
		Handler: app.enableCORS(app.router()),
	}

	app.ss.populateRooms()
	go app.deleteInactiveRooms(context.Background(), conf.RoomInactivityThreshold)

	go app.ss.processAIMsgRequest()

	log.Println("server starting at port 6969")
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("server destroyed: %v", err)
	}
}
