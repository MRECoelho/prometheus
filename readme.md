# Prometheus
## Intro
My first attempt of a workflowy clone using elcetron with a SQLite backend. At the moment it is at a very early stage and I'm still in the middle of deciding what I want and how I want to implement it. 

I started this project partly as toy project to teach myself Javascript. Although using some framework would probably result in cleaner and 'good' code, I chose to just hack my way to something I think is both useful and acceptable as a first project a new language.

## TODO
__backend__:
 - change collapse functionality: add column collapsed instead of parsing class_list column
 - rewrite class_list column concept to own columns -> no weird parsing stuff. This also makes generalizing passible (toggleComplete ~=~ toggleCollapse) as you just search for a certain column
 - enable moving of nodes
 - solidify a input output model for the promises
 - keep all essential(start transaction - ... - commit/rollback) promise logic in logic.js
 - rename functions
 - rework the db schema 
  - ~~add completed column~~
  - ~~impl node completed functionality~~
  - ~~ add priority column~~
  - impl node priority functionality
  - enable notes functionality
  - primary key as auto incr
  - current id as creation
  - search function
  - err on when cannot be collapsed (already leaf node)

__frontend__:
 - enable the drag logic
 - popup menu
 - enable css grid
 - new svg icons for priorities, marked and collapsed
 - search (results) UI
 - bug when arrow up/down with folded nodes, redesign search prev/next valid node to move to, pure frontend?