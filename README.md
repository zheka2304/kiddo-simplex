# Build and Run

![preview](https://pbs.twimg.com/media/ExQUQgcXAAQWXBn?format=jpg&name=small)

Build tasks:
```
npm i
npm run build:tasks
```

Build & run docker image:
```
docker build . --tag kiddo-nginx
docker run kiddo-nginx -p 80:80
```
