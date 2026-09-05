use that to show traffic on grafana panels
for i in $(seq 1 200); do curl -sk https://localhost:8443/api/health > /dev/null; done
for i in $(seq 1 30);  do curl -sk https://localhost:8443/api/nope   > /dev/null; done