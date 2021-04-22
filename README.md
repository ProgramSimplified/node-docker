# Node-Docker

## no compose

1. docker build -t node-app-image .
2. docker run -v $(pwd):/app:ro -v /app/node_modules --env-file ./.env  -p 3000:4000 -d --name node-app  node-app-image
3. docker exec -it node-app bash

## compose

- dev：docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
- prod：docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build