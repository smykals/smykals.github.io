---
layout: post
title: "From Spare OptiPlex to HTTPS Local AI Service"
date: 2026-09-28 10:47:00 -0400
category: Systems & Networking
description: "How I chose Debian 13, brought up Ollama and Open WebUI, and connected a management laptop to a CPU-only AI server through a segmented network."
---

I wanted to find out whether a spare mini desktop could make a useful local AI server before spending money on different hardware. The machine is a Dell OptiPlex with an **Intel Core i5, 32 GB RAM, a 256 GB SSD, and a 1 TB HDD**. It has no dedicated GPU, so model inference runs on the CPU.

The finished service combines **Debian 13**, **Ollama**, and **Open WebUI in Docker**. The interesting part was not just getting a model to respond. My management laptop is on a different network segment from the server. I wanted to open the UI from that laptop through **HTTPS**, using the server's **static IP address**, while keeping access controlled by the firewall.

This entry walks through the decisions and the order I used to isolate problems. I have sanitized the addresses and network identifiers.

## 1. Choose an operating system for the job

Before installing the AI stack, I had to decide what the OptiPlex should run. I wanted a Linux server OS that would work well on the existing hardware, support Ollama and Docker, and be straightforward to administer from another device. A desktop environment was not a requirement: the goal was to host a service and reach its web interface remotely.

I settled on **Debian 13** and installed it on the OptiPlex. The 256 GB SSD holds the operating system and application environment; the machine also has a 1 TB HDD. After installation, I checked that the host booted, had network connectivity, and could be administered before adding the model runtime. This gave me a clean base for separating an operating-system or network issue from an application issue later.

The decision was about fit, not a claim that I benchmarked multiple distributions. Debian 13 met the needs of this build.

## 2. Establish a stable server address

A service is difficult to use consistently if the destination changes. I assigned the OptiPlex a **static IP address on the server network**, then checked its address, subnet, gateway, and ability to reach the network services it needed. I also verified that the address would not conflict with another assignment.

The static address became the destination for the management-to-server firewall policy and the browser connection. It did not, by itself, make the server reachable from the management network: those networks still needed a working routed path and an explicit policy.

For troubleshooting, these are the kinds of checks I used at the Linux boundary:

```bash
ip address          # Address on the active interface
ip route            # Default gateway and route selection
ss -lnt             # TCP ports listening on the host
```

I am leaving the actual address and interface details out of the public post.

## 3. Install Ollama and prove inference locally

I installed **Ollama** on Debian and tested it from the terminal before adding the browser UI. The first useful milestone was a model answering a prompt directly on the host. That proved the runtime and model worked without involving Docker, browser access, HTTPS, or inter-network routing.

The general installation and verification path is:

```bash
# Follow Ollama's current Linux installation instructions.
ollama --version
ollama list
ollama run gemma3:1b
ollama ps
```

Ollama's [Linux installation guide](https://docs.ollama.com/linux) documents the current installer. The commands above show the verification path, rather than claiming an exact historical install command. I used `ollama ps` to confirm the loaded model was running on the **CPU**.

I tried small models with similar prompts and watched CPU and memory use while they answered. Larger models could run, but their wait time was noticeable. **Gemma 3 1B** was much more responsive on this hardware. That was the point where I stopped treating “the model loads” as a useful performance verdict. The real question was whether the response quality and delay made it pleasant to use.

## 4. Add a browser interface with Docker

Ollama's CLI proved the model worked, but I wanted a web interface I could open from my laptop. I installed Docker Engine on Debian 13 and ran **Open WebUI** as a container, with persistent application data. I then checked that the container was up, that its port was published on the host, and that the UI could connect to Ollama.

The diagnostic sequence matters:

```bash
docker ps                    # Container state and published host port
docker logs <webui-container> # Startup or connection errors
ollama list                  # Models available to the backend
```

Open WebUI's [Docker quick start](https://docs.openwebui.com/getting-started/quick-start/) explains its image, persistent volume, and the host-to-container connection used when Ollama runs on the host. Docker's [Debian installation guide](https://docs.docker.com/engine/install/debian/) covers Docker Engine on Debian 13.

I first validated the UI and model connection from the server side. If the interface loaded but did not list or run a model, I would investigate the **container-to-Ollama connection**. If the UI and model worked locally but the laptop could not open the page, the next focus was the **client-to-server path**. Keeping those tests separate saved time.

## 5. Make the management laptop reach the server

The OptiPlex sits on my **server network**. My laptop sits on a separate **management network**. When I moved the test from the server to the laptop, the UI being healthy did not guarantee that the laptop could reach it.

I traced the traffic in this order:

1. **Destination:** Was the laptop trying the OptiPlex's current static address and the intended service port?
2. **Host listener:** Was the HTTPS endpoint or published web service listening on a reachable interface, rather than only on loopback?
3. **Routing:** Did the management network have a path to the server network, and could return traffic get back?
4. **Firewall policy:** Was there an allow rule with the correct source network, server destination, protocol and port, in the correct direction and order?
5. **Client test:** Could I connect from the management laptop after the rule was in place?

I created the needed **management-to-server firewall rule** for this service. The policy was scoped to the intended path instead of opening all server services to the management network. I then retested from the laptop, which is the client that had originally failed.

A browser error is a symptom, not a diagnosis. A timeout can point toward a path or policy problem; a refused TCP connection points me toward the host listener or port; a TLS warning means I got far enough to negotiate HTTPS. I used those different outcomes to decide which layer to inspect next.

## 6. Reach the interface over HTTPS

I set up an **HTTPS endpoint** for Open WebUI and tested access from the management laptop in a browser using the server's **static IP address**. The complete request had to pass through the firewall, reach the HTTPS listener, and make it through to Open WebUI and Ollama.

I checked each part separately:

- Could the laptop establish a TCP connection to the HTTPS port at the static address?
- Did the browser reach the expected TLS endpoint?
- Did the certificate and the address used in the browser agree? When connecting by IP, the certificate must include that IP as a subject alternative name for normal browser validation.
- Once the page loaded, could I actually submit a prompt and receive an answer?

A working TLS connection does not prove the UI backend is healthy. A working Ollama prompt on the server does not prove the management laptop has a route or firewall permission. Testing the full path—**laptop → firewall → HTTPS → Open WebUI → Ollama → model**—was the final check.

I am not specifying the HTTPS termination software or how the certificate was issued here because I have not captured those implementation details accurately enough for a reproducible command-by-command guide. The endpoint and the network access are the verified parts of this build; I will add the certificate procedure when I document the actual configuration.

## What I took away

This started as a CPU-only model experiment and became a useful systems exercise. The hardware could run local inference, but a model that loads is not necessarily a model I want to wait on. Gemma 3 1B gave me a better responsiveness tradeoff than the larger models I tested.

The access problem reinforced a repeatable troubleshooting method: prove one boundary at a time, from the local model through the container, host listener, routed network, firewall rule, TLS connection, and browser. When a test failed, I could inspect that boundary instead of changing several unrelated settings.

Next I want to record repeatable prompt timings and a sanitized version of the exact HTTPS configuration. That will turn the operational notes into a more complete deployment guide.
