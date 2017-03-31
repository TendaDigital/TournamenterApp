## Tournamenter History
> Tournamenter is the 5th generation of `Scoring Systems` that I developed.

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
