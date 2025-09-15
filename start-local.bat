@echo off
echo == C&F Ceasa – NFS Keepers v5 (Local) ==
start cmd /k "cd /d backend && npm i && npm start"
start cmd /k "cd /d frontend && npm i && npm run dev"
