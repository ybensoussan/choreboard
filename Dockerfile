FROM golang:1.24-alpine AS builder

WORKDIR /build

COPY . .
RUN go mod tidy && CGO_ENABLED=0 go build -o choreboard .

FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /build/choreboard .

RUN mkdir -p /data

ENV DB_PATH=/data/choreboard.db
EXPOSE 8080

CMD ["./choreboard"]
