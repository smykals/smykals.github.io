---
layout: post
title: "Building a CPU-Only Local AI Server and Making It Reachable Across Network Segments"
date: 2026-09-28 10:47:00 -0400
category: Systems & Networking
description: "A Dell OptiPlex running Debian 13, Ollama, and Open WebUI became a practical exercise in model sizing, segmented network access, firewall policy, and HTTPS."
---

I built a local AI server on a Dell OptiPlex mini desktop running **Debian 13**. It uses the CPU for inference, with no dedicated GPU. Ollama serves the models, and Open WebUI runs in Docker to provide the browser interface.

My initial question was practical: could a small machine I already had provide a useful local AI experience? The answer depended on more than whether a model could load. I also had to make the service accessible from my management laptop, which lives on a separate network segment, and provide an HTTPS browser endpoint.

This is a record of the build and the troubleshooting path. Network identifiers and internal addresses are intentionally omitted.

## Architecture and goal

| Component | Role |
| --- | --- |
| Dell OptiPlex mini desktop | Debian 13 host and CPU inference platform |
| Ollama | Local model runtime |
| Open WebUI container | Browser interface to the local models |
| Management laptop | Client on a separate management network |
| Firewall and inter-network routing | Controlled path from the laptop to the server |
| HTTPS endpoint | Encrypted browser access to the interface |

The intended traffic path was:

**Management laptop → routed network and firewall policy → HTTPS endpoint on the server side → Open WebUI → Ollama → CPU model inference.**

Thinking of the setup as a series of boundaries helped. A healthy container proves only that a process started. It does not prove that Ollama works, that the web interface can talk to Ollama, or that a client on another segment can reach the page.

## Bring up the application locally

I started with the model runtime. After installing Ollama, I pulled small models and tested them directly from the CLI. A successful prompt there established that inference worked before I introduced the browser, Docker networking, or the firewall into the test.

Next I ran Open WebUI in Docker and checked its container status and health while it started. The web interface needed to reach the Ollama service, so I verified that the model list and a test prompt worked through Open WebUI as well. This gave me two known working points: **Ollama locally** and **the UI talking to Ollama**.

For this kind of build, the useful checks are concrete:

```bash
ollama list                 # Are the intended models installed?
ollama ps                   # Which model is loaded, and where is it running?
docker ps                   # Is the UI container up and which port is published?
docker logs <webui-name>    # If the UI is unhealthy, what does it report?
```

These are diagnostic examples, not a copy of my full deployment command. Container names, bindings, and environment variables depend on the installation.

## Measure usability, not just model compatibility

The OptiPlex has no GPU for inference, so I compared smaller models using similar prompts and watched CPU and memory use while they ran. `ollama ps` confirmed that inference was on the CPU. I also compared the experience in the CLI with the browser interface, where the application adds its own request path and presentation overhead.

**Gemma 3 1B was noticeably more responsive** on this setup than the larger models I tried. Larger models could load and answer, but the wait changed whether I would actually use them for routine questions. The experiment gave me a more useful criterion than “does it run?”: how long does it take to give an answer that is good enough for the task?

The result is specific to this CPU-only machine and my prompts. I would benchmark quality and latency again before making a broader model recommendation.

## Trace the management-to-server path

Once the application worked on the server, I moved to the management laptop. The laptop and OptiPlex are on separate network segments. The interface running on the server did **not** automatically make it reachable from the laptop.

I worked through the path in order:

1. **Identify the target.** Confirm the server's current address and default gateway, and identify the actual port exposed for the web interface or HTTPS endpoint. Testing an old address or the wrong port can look like a firewall failure.
2. **Check the service binding.** Confirm the container is healthy and the relevant port is published on the host. A service bound only to loopback will behave differently from one listening on a reachable host interface.
3. **Check the route.** Confirm that the management network has a route toward the server network and that replies can return. A policy cannot fix a missing path.
4. **Check the firewall policy.** Add an explicit allow rule for the required connection from the management side to the server-side destination, using the service port actually needed. Rule direction, source, destination, service, and rule order all matter.
5. **Retest from the laptop.** Test the port and browser endpoint from the client that initially failed, not only from the server itself.

The firewall change was for **management-to-server access**. I did not need to flatten the network or make every server service available to every segment. The policy could be scoped to the intended source, destination, and service.

A failed browser page by itself does not identify the failing layer. A timeout suggests a different line of investigation from an immediate connection refusal, a certificate warning, or an application error. I used that distinction to avoid repeatedly changing the UI when the network path was the blocker.

## Add HTTPS and test the complete request

After establishing the network path, I configured HTTPS for the web interface and accessed it from the management laptop using the intended service name. That created a second boundary to verify: the browser needed to reach the TLS endpoint, and that endpoint needed to pass requests through to Open WebUI.

I checked the following separately:

- Did the name resolve to the intended destination from the laptop?
- Could the laptop connect to the HTTPS port through the firewall?
- Did the certificate match the name used in the browser, and was it trusted by that client?
- After the TLS connection succeeded, did Open WebUI load and successfully send a prompt to Ollama?

The **certificate method and HTTPS termination component are not documented here yet**; I do not want to turn an unverified detail into a misleading setup guide. The important troubleshooting distinction is that TLS, the web application, and the model backend are separate checks. A successful TLS handshake does not prove the application works, and a working application on the host does not prove the laptop can reach it.

## What worked and what I learned

The completed path let me use the browser interface from the management laptop while keeping the OptiPlex on the server network. Gemma 3 1B offered the most responsive experience among the models I tested on this CPU-only setup.

The project reinforced three habits I want to carry into future builds:

- **Establish a working point at every boundary:** model, UI, host port, routed path, firewall policy, HTTPS, and client browser.
- **Change one layer at a time:** isolate whether the failure is reachability, TLS, application, or inference before changing configuration.
- **Measure the user experience:** successful model loading is only a starting point; response time and answer quality determine whether the service is useful.

Next I want to record repeatable prompt timings and document the exact HTTPS implementation in a separate, sanitized follow-up. That would make the comparison more rigorous and the deployment easier to reproduce.

If you run internal services across segmented networks, what test do you reach for first to locate where a connection fails?
