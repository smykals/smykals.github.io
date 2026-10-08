---
layout: post
title: "I Set Out to Build a NAS. I Ended Up Troubleshooting the Entire Stack."
date: 2026-10-01 11:05:00 -0400
category: Storage & Virtualization
description: "Building a three-drive NAS with Proxmox, TrueNAS, ZFS, Syncthing, and segmented networking turned into an end-to-end troubleshooting exercise."
---

I started this project with what sounded like a simple goal: take three **8 TB drives**, build a NAS, and give my lab a central place to store and synchronize data.

The final architecture became:

**Physical server → Proxmox VE → TrueNAS VM → ZFS → Syncthing → clients**

What I expected to be primarily a storage project ended up touching almost every layer of the stack: virtualization, disk passthrough, ZFS, applications, networking, VLAN routing, and firewall policy.

That turned out to be the most useful part of the build.

## The goal

I wanted the physical host to do more than function as a dedicated NAS appliance, so I installed **Proxmox VE** as the virtualization layer and created a dedicated **TrueNAS VM** for storage.

The storage side uses **three 8 TB drives**. Instead of building virtual disks on top of Proxmox storage and then handing those virtual disks to TrueNAS, I passed the physical storage drives through so TrueNAS could manage the ZFS pool.

The resulting pool uses **RAIDZ1** and reports roughly **14.5 TiB of usable capacity** in TrueNAS.

That number was one of the first reminders that raw disk capacity and usable storage are not the same thing.

## Why Proxmox sits underneath TrueNAS

Running TrueNAS as a VM gave me a clean separation of responsibilities.

**Proxmox** owns the virtualization layer: the host, VM resources, virtual networking, and the connection between physical hardware and virtual machines.

**TrueNAS** owns the storage layer: the passed-through disks, ZFS pool, datasets, shares, and storage-related services.

I wanted to understand both layers instead of hiding one behind the other.

That decision also meant troubleshooting had to be more deliberate. If TrueNAS could not see a disk correctly, the problem might not be in TrueNAS at all. It could be the physical disk, how Linux identified it, or how Proxmox presented it to the VM.

## Disk passthrough was the first real lesson

Passing disks through sounds simple until disk identity matters.

I wanted the VM to receive the intended physical disks consistently rather than relying on a device name that could potentially change. That pushed me into looking more closely at persistent disk identifiers and how the host distinguishes the drives.

At one point, disk identification and duplicate-looking serial information forced me to slow down and verify exactly which physical device I was working with before making storage changes.

That was a good lesson for the rest of the project:

> Do not make the next change until you can prove which layer and which device you are actually changing.

Storage is not a good place for guessing.

## ZFS capacity was not the number I expected

Three 8 TB drives do not become 24 TB of usable RAIDZ1 storage.

There are several reasons the displayed number is lower: RAIDZ1 reserves the equivalent capacity of one drive for parity, and storage vendors and operating systems commonly represent capacity using different decimal and binary units.

Once the pool was created, TrueNAS showed approximately **14.5 TiB usable**.

Instead of treating that as a problem, I worked backward through the storage math until the result made sense.

That distinction matters because troubleshooting is not always about fixing something. Sometimes the system is working correctly and the gap is between what I expected and what the technology actually does.

## Adding the application layer

Once the storage pool was working, I wanted the NAS to do more than provide a traditional file share.

I began integrating **Syncthing** so selected client folders could synchronize with storage on the NAS. The goal was a workflow closer to the convenience of a cloud-sync service while keeping the data inside my own environment.

That introduced another layer:

**Client → Syncthing → TrueNAS → ZFS**

A healthy ZFS pool did not automatically mean the application was configured correctly, and an application showing as running did not automatically mean a client could reach it.

That distinction became important very quickly.

## "It's running" does not mean "I can access it"

One of the more useful troubleshooting moments happened after a service appeared to be running but was not reachable from the client I was using.

At that point, repeatedly changing the application would have been the wrong approach.

I had to look at the entire path:

**Client → client network → gateway → VLAN routing → firewall policy → server network → TrueNAS → application**

I checked each boundary instead of treating the failure as one big problem.

Is the client configured correctly?

Can it reach its gateway?

Is the destination on another network?

Does routing exist between those networks?

Does the firewall permit the specific traffic?

Is the destination host reachable?

Is the application actually listening?

Only after those checks does it make sense to return to the application itself.

## The troubleshooting model I took away from the build

The most important result of this project is the troubleshooting sequence I ended up using:

1. **Physical hardware**: Is the disk, NIC, or device present and healthy?
2. **Hypervisor**: Does Proxmox see the hardware and present it correctly?
3. **Virtual machine**: Does TrueNAS see what Proxmox is giving it?
4. **Storage**: Is the ZFS pool healthy and behaving as expected?
5. **Application**: Is the service running and configured correctly?
6. **Network**: Is there a valid path between the client and server?
7. **Security policy**: Does the firewall permit that specific path?
8. **Client**: Can the user or device actually consume the service?

The important part is not the exact order in every situation. It is the discipline of **proving one layer before moving to the next**.

That prevents a network problem from becoming an application rebuild, or a disk-passthrough problem from becoming unnecessary changes inside TrueNAS.

## The result

The environment now gives me a virtualized storage platform with **Proxmox VE** underneath **TrueNAS**, a three-drive **RAIDZ1 ZFS pool**, and **Syncthing** as one way for clients to synchronize data with the NAS.

More importantly, the project connected several technologies I had previously worked with as separate concepts.

Proxmox was no longer just a hypervisor.

ZFS was no longer just a storage term.

VLANs and firewall policies were no longer separate networking exercises.

They all became dependencies in one working service.

## What I learned

The original objective was to build a NAS.

The more valuable outcome was learning how the complete service depends on every layer underneath it.

A storage pool can be healthy while the application is broken. An application can be healthy while the network path is broken. A firewall rule can exist while still not matching the traffic I intended. A capacity number can look wrong while the storage system is behaving exactly as designed.

The project reinforced the troubleshooting approach I want to keep developing:

**Build it. Break the problem into layers. Prove each layer. Document what happened.**

That is what my homelab is for.

---

**Technologies:** Proxmox VE · TrueNAS · ZFS · RAIDZ1 · Disk Passthrough · Syncthing · Virtualization · VLANs · Firewall Policies · Networking
