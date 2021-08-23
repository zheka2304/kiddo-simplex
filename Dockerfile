FROM nginx

COPY src /etc/nginx/kiddo/src/.
COPY nginx.conf /etc/nginx/nginx.conf
