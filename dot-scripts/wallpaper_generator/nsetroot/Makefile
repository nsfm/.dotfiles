CC?=gcc
PKG_CONFIG?=pkg-config

CFLAGS?=-g -Ofast -Wall
LDFLAGS?=

PREFIX?=/usr/local

LDFLAGS+=-Wl,--no-as-needed

CFLAGS+=$(shell $(PKG_CONFIG) x11 --cflags)
LDFLAGS+=$(shell $(PKG_CONFIG) x11 --libs)

CFLAGS+=$(shell $(PKG_CONFIG) imlib2 --cflags)
LDFLAGS+=$(shell $(PKG_CONFIG) imlib2 --libs)

all: nsetroot

nsetroot: nsetroot.o

clean:
	rm -f *.o nsetroot
