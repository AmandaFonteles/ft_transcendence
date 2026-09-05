use that to show traffic on grafana panels
for i in $(seq 1 200); do curl -sk https://localhost:8443/api/health > /dev/null; done
for i in $(seq 1 30);  do curl -sk https://localhost:8443/api/nope   > /dev/null; done


grep "^$USER:" /etc/subuid /etc/subgid check if the machina has enough uid and gid

Nothing about this is your project's fault. If it recurs during evaluation, the honest answer is: rootless Podman on a shared workstation depends on subordinate ID ranges provisioned outside the project, and podman system migrate reconciles Podman's cached view with the current ones. That's a sysadmin-level answer, and it's the right one.

If migrate alone doesn't clear it, podman system reset rebuilds storage from nothing. It deletes all images and volumes — costly only in download time, and you were doing fclean anyway.