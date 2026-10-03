---
layout: post
title: "Two VMs, Several Layers: Troubleshooting the Stack"
date: 2026-10-03 06:00:00 -0400
category: Virtualization
description: "Building Windows 11 and Void Linux VMs on Proxmox turned into a practical exercise in firmware, VirtIO drivers, networking, Linux services, and layered troubleshooting."
---

What started as a simple plan to build two virtual machines turned into a useful reminder that virtualization is really a stack of dependencies.

The goal was straightforward: repurpose an existing system as a Proxmox host, build a Windows 11 VM for jump and administrative work, and add a minimal Linux VM that would push me outside the Debian environment I already use elsewhere in the lab.

By the end of the build, both VMs had taught me more through their failures than a clean installation probably would have.

## Goal

The project had three objectives:

1. Build a new Proxmox virtualization host from repurposed hardware.
2. Create a Windows 11 jump VM for administrative work.
3. Create a minimal Linux VM for hands-on systems administration practice.

I also wanted the finished environment to be documented well enough that I could return later and understand not only the final configuration, but why I made each decision.

## Environment

The public-safe version of the environment looks like this:

```text
                 Firewall / Gateway
                        |
                 Server Network
                        |
                    Proxmox
                   /       \
                  /         \
        Windows 11 VM     Void Linux VM
          Jump/Admin       Learning VM
```

The Proxmox host uses a Linux bridge to connect the guest virtual NICs to the server network. Internal addresses, hostnames, MAC addresses, and other private lab details are intentionally omitted from this journal.

The Windows VM uses:

- Windows 11
- OVMF / UEFI firmware
- Virtual TPM 2.0
- VirtIO SCSI storage
- VirtIO networking

The Linux VM uses:

- Void Linux x86_64 glibc base image
- SeaBIOS
- GPT partitioning
- ext4 root filesystem
- XBPS package management
- runit service supervision
- VirtIO storage and networking

## Building the Windows 11 VM

The Windows VM was the first build, and it immediately became an exercise in understanding where the hypervisor ends and the guest operating system begins.

### Problem 1: Windows would not boot correctly

The first issue was a VM configuration mismatch. The guest had initially been configured with the wrong operating-system type in Proxmox.

Correcting the VM to use the appropriate Windows configuration got the installation moving again.

### Problem 2: TPM 2.0

Windows 11 then stopped because it expected TPM 2.0.

Proxmox can provide a virtual TPM, so I added a TPM state device configured for version 2.0 and used UEFI firmware for the VM.

That solved the firmware/security requirement, but the next problem appeared immediately.

### Problem 3: Windows Setup could not see the disk

Proxmox could see the virtual disk. The VM had the disk attached. Windows Setup showed no drives.

That distinction mattered.

The disk itself was not broken. Windows simply did not yet have the driver required to communicate with the VirtIO SCSI controller.

I mounted the VirtIO Windows driver ISO and loaded the Windows 11 x64 SCSI driver from:

```text
vioscsi\w11\amd64
```

The disk appeared as soon as the correct driver was loaded.

That was one of the most useful lessons from the build:

> The hypervisor presenting a device and the guest operating system understanding that device are two separate things.

## Then Networking Broke

After storage was solved, Windows reached its out-of-box setup and needed network connectivity.

The virtual NIC was configured as VirtIO, so Windows needed another driver. This time I loaded the network driver from:

```text
NetKVM\w11\amd64
```

Windows recognized the Ethernet adapter.

But there was still no Internet connection.

At that point it would have been easy to assume the VirtIO driver was still the problem. It was not.

The NIC existed. The driver worked. The VM was connected to the correct Proxmox bridge.

The remaining problem was Layer 3 addressing.

The lab server network is designed around controlled addressing rather than simply allowing every device to obtain an unrestricted DHCP lease. I temporarily used DHCP during the bootstrap process, then moved the systems toward predictable addressing.

This turned into a good troubleshooting sequence:

```text
Virtual hardware
      ↓
Guest driver
      ↓
Layer 2 connectivity
      ↓
IP addressing
      ↓
Default gateway
      ↓
DNS
```

A working network adapter does not automatically mean there is a working network.

## Choosing Void Linux for the Second VM

I already use Debian on other systems, so I did not want the second VM to be another installation I could complete mostly from habit.

I chose Void Linux because it would expose me to a different set of tools and assumptions:

- XBPS instead of APT
- runit instead of systemd
- a minimal base installation
- manual service management
- manual partitioning
- more deliberate network configuration

I managed to create a troubleshooting problem before the installer even started.

### Wrong architecture

The first ISO I downloaded was an Asahi build.

That was the wrong architecture for this x86_64 VM.

The correct base image was the x86_64 glibc build.

It was a small mistake, but it reinforced another troubleshooting rule: verify the artifact and architecture before assuming the hypervisor is broken.

## Installing Void

For this VM I used SeaBIOS with a GPT partition table.

That required a small BIOS boot partition for GRUB, followed by the Linux root filesystem.

A simplified example layout is:

```text
/dev/sda1    1 MiB       BIOS boot
/dev/sda2    remaining   ext4   /
```

The BIOS boot partition is not formatted or mounted like a normal filesystem.

I created a normal administrative user, enabled the appropriate administrative group, kept the service selection minimal, and used DHCP temporarily to get the system online during installation.

Once the system was installed, the next objective was to make networking persistent without depending on the temporary DHCP configuration.

A public-safe example network would look like:

```text
Network: 192.0.2.0/24
Gateway: 192.0.2.1
Host:    192.0.2.20/24
```

`192.0.2.0/24` is documentation space used here instead of exposing the actual lab addressing.

## What I Documented

I have been trying to improve how I document homelab projects.

Instead of recording only the final state, I created an Obsidian vault covering:

- physical host purpose
- Proxmox configuration
- VM architecture
- Windows 11 build notes
- VirtIO storage and network drivers
- Void Linux installation
- static networking
- troubleshooting logs
- command references
- lessons learned

That distinction is becoming important to me.

A network diagram tells me what the environment looks like now.

A troubleshooting journal tells me how I got there.

## Troubleshooting by Layer

The biggest lesson from this build was not a particular Proxmox setting or Linux command.

It was the value of identifying which layer has actually failed before changing things.

When Windows could not see the disk, the virtual disk existed. The missing piece was the guest storage driver.

When Windows showed a network adapter but had no connectivity, the NIC and driver were working. The next layer to investigate was addressing and routing.

When Void would not boot from the first ISO, changing VM networking would have accomplished nothing. The installation image itself was for the wrong architecture.

The workflow I want to keep using is:

```text
Observe the symptom
        ↓
Identify the layer
        ↓
Test that layer
        ↓
Change one thing
        ↓
Verify the result
        ↓
Document the fix
```

## Outcome

By the end of the session I had:

- a functioning Proxmox virtualization host
- a Windows 11 jump/admin VM
- UEFI and TPM 2.0 configured for Windows 11
- VirtIO SCSI storage working
- VirtIO networking working
- a minimal Void Linux VM
- experience with XBPS and runit
- a predictable network-addressing plan
- a detailed Obsidian vault documenting the build and troubleshooting process

The environment is still evolving, but that is the point.

## Lessons Learned

**Troubleshoot the layer.** Do not keep changing the hypervisor when the problem is inside the guest.

**Understand the dependency.** A virtual device is only useful if the guest can communicate with it.

**Drivers matter.** VirtIO provides efficient virtual hardware, but Windows may need those drivers supplied during installation.

**A working NIC is not a working network.** Layer 2, addressing, routing, and DNS are separate dependencies.

**Verify the architecture.** Sometimes the problem is not complicated; the wrong ISO is simply the wrong ISO.

**Document the failure, not just the success.** The path to the final configuration is often more valuable than the final screenshot.

My homelab is becoming less about collecting equipment and more about creating an environment where I can build, break, troubleshoot, understand, and document infrastructure.

That is where the learning happens.
