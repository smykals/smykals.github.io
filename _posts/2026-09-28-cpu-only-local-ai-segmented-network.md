---
layout: post
title: "From Spare OptiPlex to HTTPS Local AI Service"
date: 2026-09-28 10:47:00 -0400
category: Systems & Networking
description: "My build notes on Debian 13, CPU-only Ollama, Open WebUI, and making the service reachable from a separate management network."
---

I had a Dell OptiPlex mini desktop and wanted to find out how useful it could be as a local AI server before considering different hardware. It has an **Intel Core i5, 32 GB of RAM, a 256 GB SSD, and a 1 TB HDD**. There is no dedicated GPU, so whatever model I chose would have to run on the CPU.

I ended up with **Debian 13**, **Ollama** for inference, and **Open WebUI in Docker** for the browser interface. Getting a model to answer locally was only the first part. I also wanted to open the UI from my management laptop, which is on a separate network segment, using the server's **static IP address over HTTPS**.

Here is how I approached the build and where the troubleshooting got interesting. I've left out my actual addresses and network identifiers.

## Deciding what Linux to run

I started with the operating system because it would affect everything after it: Docker support, how I would administer the machine, and how much of its CPU and memory would be left for inference. I did not need a full desktop on the server. I needed a dependable base that I could manage remotely and use to host services.

I chose **Debian 13** and installed it on the OptiPlex. Once it booted, I worked through the basics before adding AI software: network connectivity, the server address and gateway, and access to the machine for administration. I wanted a known working Linux host so that a later browser problem would not send me back to guessing whether the OS installation itself was sound.

This was a practical choice for my setup, not a benchmark showing Debian outperforming other distributions.

## Giving the server a consistent place on the network

The OptiPlex is on my server network. I set it up with a **static IP address** so the destination would remain predictable for both my browser and the firewall rule I would need later. I checked its interface address, route, and gateway before I moved on.

```bash
ip address
ip route
```

Those checks became important when I tried to reach it from another segment. A service can work perfectly on the server and still be unreachable from a laptop if I am testing the wrong address, the route is missing, or the firewall policy does not match the traffic.

## Getting Ollama working before adding a browser

I installed Ollama on Debian, downloaded small models, and ran prompts directly from the terminal. That gave me a baseline: I knew the runtime could load a model and return an answer on this hardware before I introduced Docker or the network path from my laptop.

I used commands such as these to inspect the local side:

```bash
ollama list
ollama run gemma3:1b
ollama ps
```

`ollama ps` showed the model running on the **CPU**. I tried smaller and larger options with similar prompts while watching resource use and how long I actually waited for an answer. The larger models I tested ran, but the delay was noticeable. **Gemma 3 1B** felt much more responsive on this machine.

That changed the question I was asking. “Can it load?” is a compatibility check. “Would I choose to use it regularly?” depends on the quality of the answer and the time it takes to get there.

## Adding Open WebUI

The command line was useful for testing, but I wanted a browser interface. I installed Docker Engine and ran **Open WebUI** in a container with persistent data, then checked the container state and whether Open WebUI could see and use the Ollama models.

```bash
docker ps
docker logs <webui-container>
ollama list
```

The separation helped me troubleshoot. If Ollama answered in the terminal but no model appeared in Open WebUI, I would focus on the connection between the container and Ollama. Once the UI could send a prompt and get a response on the server side, I had a working application. Only then did I move to access from my laptop.

The [Ollama Linux guide](https://docs.ollama.com/linux), [Docker's Debian guide](https://docs.docker.com/engine/install/debian/), and [Open WebUI's Docker quick start](https://docs.openwebui.com/getting-started/quick-start/) are useful references for the current installation commands. The commands above document my verification points; they are not a claim that I preserved every original installation command.

## Reaching it from my management laptop

This is where the project became more than “install a model on a mini PC.”

My laptop is on a **management network**; the OptiPlex is on a **server network**. Open WebUI running on the OptiPlex did not mean my laptop automatically had permission to reach it. I had to consider the entire path between the two devices.

I checked the server's static address and the port I intended to use. I checked that the service was listening on the host, then looked at the route between the networks and the firewall policy controlling the connection. I created a rule allowing the required **management-to-server** traffic to the OptiPlex for the service, then tested again from the laptop.

The detail that matters in a rule like this is the match: **source, destination, protocol, port, direction, and rule order**. If one is wrong, the rule can exist and the connection can still fail. I wanted to permit access to the service I needed without making the entire server network broadly available.

I learned to be more precise about what “it doesn't work” meant. If the laptop cannot establish a TCP connection, that points me toward the destination, listening port, route, or policy. If it connects but the browser reports a certificate problem, I have already made it through part of the network path. If the page loads but a prompt fails, I can return to Open WebUI and Ollama. Those are different failures, even though they can all begin as “I can't use the AI server.”

## Putting HTTPS on the browser path

After working through reachability, I set up **HTTPS** for the web interface and opened it from my management laptop using the server's **static IP address**. I tested more than whether the page appeared: the browser had to reach the HTTPS endpoint, Open WebUI had to load, and a prompt had to make it through to Ollama and back.

Connecting by IP also made the certificate worth checking carefully. For normal browser validation, a certificate has to identify the IP address being used, and the client has to trust its issuer. I treated any certificate warning separately from a routing or firewall failure.

I have not included a proxy configuration or certificate issuance command here because I do not have those exact details recorded well enough to present them as my steps. I would rather document that part accurately in a follow-up than give someone a plausible procedure that is not the one I used.

## What this build taught me

The finished path is **management laptop → firewall and routed networks → HTTPS → Open WebUI → Ollama → CPU inference**. Each arrow represents a place where I could test something instead of changing the whole setup at once.

The OptiPlex has been useful for learning local AI without a GPU, and Gemma 3 1B gave me a better speed tradeoff than the larger models I tried. Just as valuable, the access issue made me work through Linux networking, Docker, a static server address, inter-network firewall rules, and HTTPS as one connected system.

My next step is to record repeatable prompt timings and the exact HTTPS configuration in a sanitized follow-up. For now, the biggest lesson is the troubleshooting method: **prove what works locally, then move one boundary outward until you find where the request stops**.
