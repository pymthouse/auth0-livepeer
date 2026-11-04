# go-livepeer remote signer — extends livepeer/go-livepeer:latest (CUDA libs required by binary).
# Do not copy livepeer into debian:slim; the binary links libnppig.so and other CUDA NPP libs.

FROM livepeer/go-livepeer:latest

RUN mkdir -p /data

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV SIGNER_NETWORK=arbitrum-one-mainnet
ENV SIGNER_PORT=8081
ENV ETH_RPC_URL=https://arb1.arbitrum.io/rpc
ENV SIGNER_ETH_ADDR=""
ENV SIGNER_REMOTE_DISCOVERY=0
ENV KAFKA_BROKERS=kafka:9092
ENV KAFKA_GATEWAY_TOPIC=livepeer-gateway-events

EXPOSE 8081 4935
VOLUME ["/data"]

ENTRYPOINT ["/entrypoint.sh"]
