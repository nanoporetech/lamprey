### Lamprey ###

Lamprey is a GUI wrapper around nanonet, the Oxford Nanopore Technologies Research-grade basecaller.

Nanonet is wrapped with a ZeroMQ service and compiled/packed using pyinstaller, attempting to also pull in all prerequisite libraries.

The GUI is provided by a basic Electron application which examines the number of logical cores and forks n-1 nanonet services listening on a sequential range of ports.
