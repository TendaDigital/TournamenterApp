# Tournamenter App
[![Build Status](https://travis-ci.org/ivanseidel/TournamenterApp.svg?branch=master)](https://travis-ci.org/ivanseidel/TournamenterApp) [![Build status](https://ci.appveyor.com/api/projects/status/kip5669pxyqr23jg?svg=true)](https://ci.appveyor.com/project/ivanseidel/tournamenterapp)


This project is an wrapper for the [Tournamenter](https://github.com/ivanseidel/tournamenter)
app. It is a service manager that can launch and manage Tournamenter servers locally.

## Tournamenter is
A system that allows you to manage your tournament or event, built with
[Node.JS](https://nodejs.org) and [Electron](https://electron.atom.io).

It allows you to run events with a easy to use interface that let's you:
* Manage Teams
* Create Groups (Like Soccer Groups)
* Create Tables (With custom ranking options and Columns)
* Create `Views` that will be displayed in TV Screens and Projectors
  (With custom `Pages` that can be customized)

## What it does
It allows you to create instances ("run servers") of Tournamenter without knowing
a bit of `Terminal`. You can run multiple instances of Tournamenter simultaneously.

## History
Tournamenter is the 5th generation of `Scoring Systems` that I developed.

It started while organizing [FLL](http://www.firstlegoleague.org/) tournaments
in Brazil. The main purpose of the first one, was to simplify the scoring system
and allow Live Twitter feeds mixed with Scorings.

Although the first one was reliable, it wasn't generic enough. I then built with
other friends, a second version really complete, however still specific for the
FLL and it was dependent on Internet + MySQL DB.

Preparing the third version was a way to fix the past ones, keeping it
[KISS](https://en.wikipedia.org/wiki/KISS_principle). It was a single HTML file
that loaded a `.csv` file from the same folder, and didn't required any `terminal`
knowledge to use (until Chrome added a safety precaution to loading files
and complicated the life for using it).

It was in 2013-2014, that I was engaged in a project for RoboCup: Build the software
that would manage all the 23 simultaneous competitions. The main challenge was to
create something that could adapt to different realities in each League. The
concept was abstracted, generalized, and Tournamenter came to the World
(Still hosted (here)[https://github.com/RoboCupDev/tournamenter]).

After some years, a few people have used it, and mostly because they knew how to
use *"THE terminal"*. In the time I built it, I used `Sails` framework, and really
didn't like how it worked **(it broke tournamenter after some years because of version conflicts)**.

*Finally*, came to the world `Tournamenter`, with uppercase `T`, a refactored
version of original `tournamenter`, but without `Sails`, and more a few features, and it's
father: `Tournamenter Manager`, the Desktop application to manage multiple tournamenter
instances easily. THE END

**TL;DR;**: I wasted my time 3 times before doing something that I would never
need to do again, and then I re-did it to never have to do it again (again).

## Prerequisites:

A Computer! With or without internet.

The latest version of TournamenterApp!

#### On Windows:

- Make sure your machine is at least on `Windows 7`
- It's always good to have administrator privileges
- [Download Here](http://what.com)

#### On MacOs

- You do not need to `sudo`, but it's also good to be an admin
- [Download Here](http://what.com)

#### On Linux

- TODO
- The Linux version does not currently automatically update so you will need to download newer versions.
- [Download Here](http://what.com)

## Documentation

If you want to learn more about how to use Tournamenter, check out our [Wiki](TODO).
