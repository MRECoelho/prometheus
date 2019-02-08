"use strict";
module.exports = {  init: init, 
                    applyForInsertAfter:applyForInsertAfter, 
                    applyForNodeDeletion:applyForNodeDeletion,
                    applyForSaveName: applyForSaveName,
                    applyForIndentNode: applyForIndentNode,
                    applyForUnindentNode: applyForUnindentNode,
                    toggleCollapse: toggleCollapse,
                    toggleComplete: toggleComplete};
var url = require('url');
var path = require('path');
var sqlite3 = require('sqlite3');

let db;

function init(cb){
    db = new sqlite3.Database(  path.join(__dirname, './prometheus.db') , function (err) {
        if (err) {
            console.error(err.message);
            // either cant open db or does not exist
            // TODO: create helpful error managing
        }
        console.log('Connected to the database.');
    });

    // check for table if not exist
    let p = new Promise((resolve, reject)=>{
        db.run(`CREATE TABLE if not exists node_table (
            id integer primary key,
            name text,
            notes text,
            parent_id integer not null,
            child_nr integer  not null,
            class_list text,
            style text,
            ref_type text  not null,
            ref integer,
            list_id integer  not null,
            creation integer,
            deletion integer,
            last_update,
            updates text,
            meta blob
            );`, [], 
            (err)=>{
                if(err){
                    console.log("error creating table:", err);
                    reject(err);
                    // TODO: better error handling
                }else{
                    console.log("table newly created");
                    resolve();
    
                }        
            }
        );
    })
    .then(()=>{
        return new Promise((resolve, reject) =>{
            // TODO: filter on 1 list_id, either last updated one or the very first entry as default.


            let sql = `select A.mxd, A.idx, A.name, B.*   from (


                select  *, max(distance) as mxd from (   with recursive
                descendants as
                  ( select name, id as idx, parent_id as parent, 1 as distance
                    from node_table
                  union all
                    select d.name, d.idx, s.parent_id, d.distance + 1
                    from descendants as d
                      join node_table s
                        on d.parent = s.id
                  )
                select *
                from descendants
                
                  )  group by idx order by mxd asc, parent asc
                
                ) as A
                
                left join (
                select * from node_table
                ) as B
                 on A.idx = B.id  order by A.mxd asc, B.parent_id asc, B.child_nr asc;`

                    
                 //OLD:  `select * from node_table order by parent_id asc, child_nr asc `
            db.all(sql, [], (err, rows)=>{
                if (err){
                    reject(err);
                }else{
                    // console.log(rows);
                    // TODO: not use callbacks but promises cogn ergo easier to pipe
                    cb(rows);
                    resolve();
                }
            })
        });

     }).catch((err)=>{console.log("caught error: ",err)});

    



}

const startTransaction = (pipe)=>{
    return new Promise((resolve, reject)=>{
    console.log("piped args: ",  pipe)
      db.exec("BEGIN TRANSACTION;",(err)=>{
        if(err){
          reject(err)
        }
        resolve(pipe);
      });
    })
  }

const validateNodeExistance =(refNodeID, args)=>{
    return new Promise((resolve,reject)=>{
        // validation: is node a valid nodeID
        let sql = `select exists(select 1 from node_table where id = ${refNodeID}) as result;`;
        // console.log(sql);
        db.get(sql, [], (err, row)=>{
            if(err){
                reject(err)
            }else if(row['result']===1){

                resolve(args);
            }else{
                reject('invalid node');
            }
        })
    })
}

const insertAfterMain = (args)=>{
    return new Promise((resolve, reject)=>{
        let refNodeID = args.refNodeID;
        let nodeObj = args.nodeObj;

        // let nodeObj = createNode();
        let sql = `select * from node_table where parent_id = ${refNodeID} or id = ${refNodeID}`;
        db.all(sql,[], (err,rows)=>{

            if(err){

                reject(err);
            }
            let overrideArgs;
            
            if(rows.length ===1) {
                // add sibling after
                overrideArgs = {  
                    "parent_id": rows[0]["parent_id"], 
                    "child_nr": rows[0]["child_nr"]+1, 
                    "list_id": rows[0]["list_id"]};
            }else{
                // add as first child
                overrideArgs = {  "parent_id": refNodeID, 
                    "child_nr": 1, 
                    "list_id": rows[0]["list_id"]}
            }
                                    
            nodeObj = Object.assign(nodeObj,overrideArgs); 

            resolve(nodeObj);

        })

    })
}

const deleteNodeMain=(args) =>{
    console.log(" here 1", args)
    return new Promise((resolve, reject)=>{
        console.log(" here 2")
        let refNodeID = args.refNodeID;
        // must not have children

        // if(args.hasChildren===true){
        //     reject("Has children.")
        // }else{

        // }

        let sql = `select count(1) as result from node_table where parent_id = ${refNodeID}`
        db.get(sql,[],(err,row)=>{
    
            if(err){
                reject(err);
            }
            else if(row.result !== 0){
                reject("has children")
            }else{
                // cannot be the only child if parent is root
                let sql2 = `select parent_id,child_nr from node_table where id = ${refNodeID}`
                db.get(sql2,[],(err,row)=>{
                    if(err){
                        reject(err)
                    }
                    console.log("sql2 = ",sql2);
                    args.child_nr = row.child_nr;
                    args.parent_id = row.parent_id;
                    
                    if(row.parent_id !== 0){
                        resolve(args)
                    }else{
                        // root should have 2 or more children
                        let sql3 = `select count(1) as result from node_table where parent_id = ${row.parent_id}`
                        db.get(sql3, [], (err,row)=>{
                            if(err){
                                resolve(err)
                            }
                            else if(row.result <= 1){
                                reject("only child of root cannot be deleted")
                            }
                            else{
                                resolve(args)
                            }        
                        })
                    }
                })
            }
        })
    })
    
}

// const forceDeleteNodeMain=(args)=>{
//     return Promise((resolve, reject)=>{
        
//         let sql = `select count(1) as result from node_table where parent_id = ${row.parent_id}`

//         db.get(sql,[], (err,row)=>{
//             if(err){
//                 reject(err)
//             }
//             else if(row.result <= 1){
//                 reject("only child of root cannot be deleted, even by force, delete list instead")
//             }else{
//                 resolve();
//             }
//         })
//     })
// }


const hasChildren = (args)=>{
    return new Promise((resolve,reject)=>{
        let sql = `select count(1) as result from node_table where parent_id = ${args.refNodeID}`
        db.get(sql, [], (err,row)=>{
            if(err){
                reject(err)
            }
            
                args.hasChildren = row.result ===0? false : true;
                console.log("node has children:", args.hasChildren)
                resolve(args);
            
        })
    })
}

const toggleCollapseMain = (args)=>{
    return new Promise((resolve, reject)=>{

        if(args.hasChildren===false){
            return reject("No children to collapse.")
        }

        // get current style
        let collapseStr ="collapsed"
        let unCollapseStr ="uncollapsed"
        
        let sql = `select class_list from node_table where id = ${args.refNodeID}`
        db.get(sql, [], (err, row)=>{
            if (err){
                reject(err)
            }else{
                let classList = row.class_list;
                
                var updateArgs = new Map();
                var conditionArgs = new Map();
                conditionArgs.set("id", Number(args.refNodeID));

                if( classList.search(unCollapseStr)===-1){
                    //collapse
                    updateArgs.set("class_list", classList.replace(collapseStr,unCollapseStr))
                }else{
                    //uncollapse
                    updateArgs.set("class_list", classList.replace(unCollapseStr, collapseStr));
                }
                
                args.updateArgs = updateArgs;
                args.conditionArgs = conditionArgs;
                resolve(args)
            }
        })
    })
}
const toggleCompleteMain = (args)=>{
    return new Promise((resolve, reject)=>{

        // get current style
        // let completeStr ="collapsed"

        
        let sql = `select completed as result from node_table where id = ${args.refNodeID}`
        db.get(sql, [], (err, row)=>{
            if (err){
                reject(err)
            }else{
                let classList = row.class_list;
                
                var updateArgs = new Map();
                var conditionArgs = new Map();
                conditionArgs.set("id", Number(args.refNodeID));

                if( row.result === undefined || row.result === 0){
                    //collapse
                    updateArgs.set("completed", Number(1))
                }else{
                    //uncollapse
                    updateArgs.set("completed", Number(0))
                }
                
                args.updateArgs = updateArgs;
                args.conditionArgs = conditionArgs;
                resolve(args)
            }
        })
    })
}

const updateNode = (args)=>{

    return new Promise((resolve, reject)=>{


        // console.log("args=", args)
        let updateCols = [];
        let updateVals = [];
        let conditionCols = [];
        let conditionVals = [];
        args.updateArgs.forEach((v,k) => {
            updateCols.push(k); 
            updateVals.push(v);
        });
        args.conditionArgs.forEach((v,k) => {
            conditionVals.push(v);
            conditionCols.push(k); 
        });



        console.log("cols vals",updateCols, updateVals, conditionVals, conditionCols);

        let sql = `update node_table set ${updateCols.map(cond=>{return `${cond} = ?`}).join(", ")} where (${conditionCols.map(cond=>{return `${cond} = ?`}).join(", ")})`;
        console.log("update node = ", sql, " | args =", args);
    
        db.run(sql, updateVals.concat(conditionVals), (err)=>{
            console.log("exec ",sql);
            if(err){
                // console.log("but got error")
                reject(err)
            }else{
                resolve(args);
            }
        })
        
    })
}

const insertNode = (nodeObj)=>{

    return new Promise((resolve, reject)=>{

        let sql = `insert into node_table(id, name, notes, parent_id, child_nr, class_list, style, ref_type, ref, list_id) 
        values(?,?,?,?,?,?,?,?,?,?)`;
        db.run(sql, [nodeObj.id, nodeObj.name, nodeObj.notes, nodeObj.parent_id, nodeObj.child_nr,nodeObj.class_list, nodeObj.style, nodeObj.ref_type, nodeObj.ref, nodeObj.list_id], (err)=>{

            if(err){

                reject(err);
            }else{

                // return finalized nodeObj in case for further handling

                resolve(nodeObj);
            }
        })
    })
}

// rules for deletion
// cannot be only child of root
// must not have children

const deleteNode = (args)=>{
    return new Promise((resolve, reject)=> {

        let refNodeID = args.refNodeID;
        console.log("del node", args)
        let sql = `delete from node_table where (id = ${refNodeID})`;
        db.run(sql,[],(err)=>{
            if(err){
                reject(err);
            }else{
                resolve(args);
            }
        })
    })
}

const prepareIndentNode =(args)=>{
    return new Promise((resolve, reject)=>{
        // rules
        // needs to have a younger sibling get id where child nr = (select child nr where id = refNode) -1 
        var updateArgs = new Map();
        var conditionArgs = new Map();
        conditionArgs.set("id", Number(args.id));
        let refNodeID = args.id;
        let sql = `select *  from node_table where parent_id = (select parent_id from node_table where id = ${refNodeID}) and child_nr = (select child_nr from node_table where id = ${refNodeID})-1`
        db.get(sql,[], (err,row)=>{
            if (err){
                reject(err)
            }else if(row){
                console.log("row = ", row)
                args.child_nr =  row.child_nr + 1 ; // new child nr as it is added at end of parent children list
                args.parent_id = row.parent_id; //younger sibling as new parent
                updateArgs.set("parent_id", Number(row.id));
                let sql2 = `select count(1) as result from node_table where parent_id = ${row.id}`; //count children of new parent
                db.get(sql2,[],(err,row)=>{
                    if(err){
                        reject(err)
                    }else{




                        updateArgs.set("child_nr",  Number(row.result +1));
                        args.updateArgs = updateArgs;
                        args.conditionArgs = conditionArgs;


                        resolve(args)
                    }
                })
            }else{ 
                console.log(args)
                console.log(sql)
                console.log(row)
                reject("no younger sibling")
            }
        })
    })
}

// const indentNode =(args)=>{
//     return new Promise((resolve, reject)=>{
//         let refNodeID = args.refNodeID;
//         let newParentID = args.newParentID;
//         let child_nr = args.child_nr;
//         let sql = `update node_table set `
//     })
// }

const prepareUnindentNode =(args)=>{
    return new Promise((resolve, reject)=>{
        
        let sql = `select A.old_child_nr, B.* from (select parent_id, child_nr as old_child_nr from node_table where id = ${args.id} ) as A   left join (select * from node_table ) as B on A.parent_id=B.id;`
        db.get(sql, [], (err, row)=>{
            if(err){
                reject(err)
            }
            else if (row.parent_id===0){
                reject("cant unindent root children")
            }else{
                console.log("row = ",row)
                args.post_child_nr = row.child_nr+1; // for add
                args.post_parent_id = row.parent_id; // for add

                console.log("post -> ", args.post_child_nr, args.post_parent_id);

                // args.id='' // for del // already defined
                args.child_nr = row.old_child_nr; // for del
                args.parent_id = row.id; // for del

                console.log("for del :", args.child_nr, args.parent_id)

                // for update of noderef
                var updateArgs = new Map();
                var conditionArgs = new Map();
                updateArgs.set("parent_id", Number(args.post_parent_id) )
                updateArgs.set("child_nr", Number(args.post_child_nr) )
                conditionArgs.set("id", Number(args.id))
                args.conditionArgs = conditionArgs;
                args.updateArgs = updateArgs;
                resolve(args);
            }
        })
        
        // row.old_child = 'the child nr of the ref node at current position'
        // row.child_nr + 1 will become ref node's new child number

        // select parent,
            // if not parent === 0
            // insert as parent's new sibling, child_nr = parent childnr +1 ,  
                // for adding: use args.post_chil_nr and args.post_parent_id 
                // first del will be executed than add

            // prep for node update & update child nr  of previoud siblings -1
                // use args.id, args.parent_id, args.child_nr
                // resolve with args
    

    })
}

// const unindentNode =(args)=>{
//     return new Promise((resolve, reject)=>{
        
//     })
// }


const updateSiblingsChildNrDel = (args)=>{

    return new Promise((resolve, reject)=>{

        let parent_id = args.parent_id;
        let child_nr = args.child_nr;
        console.log("updateSiblingsChildNrDel recieved:", args)
        let sql=`update node_table set child_nr = 
        case when  
        parent_id = ${parent_id} and 
        child_nr >= ${child_nr} 
        then child_nr - 1 else child_nr end;`
        db.run(sql, [], (err)=>{
            if(err){
                reject(err);
            }
            else{

                resolve(args)
            }
        })



    })
}


const updateSiblingsChildNrAdd = (args)=>{

    return new Promise((resolve, reject)=>{
        let id = args.id;
        let parent_id = args.parent_id;
        let child_nr = args.child_nr
        console.log("updateSiblingsChildNrAdd recieved:", args);
        let sql=`update node_table set child_nr = 
        case when id is not ${id} and 
        parent_id =  ${parent_id} and 
        child_nr >= ${child_nr} 
        then child_nr +1 else child_nr end;`
        db.run(sql, [], (err)=>{
            if(err){
                reject(err);
            }
            else{

                resolve(args)
            }
        })



    })
}

const queryReturn = ()=>{
    return new Promise((resolve, reject)=>{
      db.all("select * from node_table;",(err,rows)=>{
        if(err){
          reject(err)
        }

        resolve(rows);
      });
    })
  }

const commitTransaction = (x)=>{
    return new Promise((resolve, reject)=>{
        console.log("commiting: ",x)
      db.exec("COMMIT;",(err)=>{
        if(err){
          reject(err)
          db.exec("ROLLBACK;");
        }
        resolve(x);

      });
    })
  }
  const rollbackTransaction = (x)=>{
    return new Promise((resolve, reject)=>{
        console.log("rollback: ",x)
      db.exec("ROLLBACK;");
      reject(x);
    })
  }
function applyForInsertAfter(refNodeID, params, prevNodeUpdate){
    // return new Promise((resolve, reject)=>{
        let args = {refNodeID: refNodeID, nodeObj: createNode(params)}
        let res = validateNodeExistance(refNodeID, args)
        .then(startTransaction)
        .then(insertAfterMain)
        .then(insertNode)
        .then(updateSiblingsChildNrAdd)

        if(prevNodeUpdate){
            return res.then(succes => {return updateNode(prevNodeUpdate).then(()=> {return succes})})
            .then(commitTransaction,(err)=>{db.exec("ROLLBACK;");return err})
        
        }else{
            return res.then(commitTransaction,(err)=>{db.exec("ROLLBACK;");return err})
        }
}

function applyForSaveName(nodeID, args){
    return validateNodeExistance(nodeID, args)
    .then(startTransaction)
    .then(updateNode)
    .then(commitTransaction,rollbackTransaction)
}

function applyForIndentNode(nodeID){
    let args = {id: nodeID};
    return validateNodeExistance(nodeID,args)
    .then(startTransaction)
    .then(prepareIndentNode)
    .then(updateNode)
    .then(updateSiblingsChildNrDel)
    .then(commitTransaction, rollbackTransaction);
}

function applyForUnindentNode(nodeID){
    let args = {id: nodeID};

    return validateNodeExistance(nodeID,args)
    .then(startTransaction)
    .then(prepareUnindentNode)
    .then(updateNode)
    .then(updateSiblingsChildNrDel)
    .then(ok => {ok.parent_id = ok.post_parent_id;
                ok.child_nr = ok.post_child_nr;
                return updateSiblingsChildNrAdd(ok)})
    .then(commitTransaction, rollbackTransaction);
}


function applyForNodeDeletion(nodeID){
    let args = {refNodeID: nodeID};
    console.log("here -1 , nodeID")
    return validateNodeExistance(nodeID,args)
    .then(startTransaction)
    .then(deleteNodeMain)
    .then(deleteNode)
    .then(updateSiblingsChildNrDel)
    .then(commitTransaction,rollbackTransaction);
}

function toggleCollapse(nodeID){
    let args = {refNodeID: nodeID};
    return validateNodeExistance(nodeID,args)
    .then(startTransaction)
    .then(hasChildren)
    .then(toggleCollapseMain)
    .then(updateNode)
    .then(commitTransaction,rollbackTransaction)
}
function toggleComplete(nodeID){
    let args = {refNodeID: nodeID};
    return validateNodeExistance(nodeID,args)
    .then(startTransaction)
    .then(toggleCompleteMain)
    .then(updateNode)
    .then(commitTransaction,rollbackTransaction)
}



const createNode = (args=null)=>{
    //default
    let obj= 
        {"id": Date.now(), 
            "name": null,
            "notes": null,
            "parent_id": null, 
            "child_nr":null,
            "class_list": "node uncollapsed", 
            "style": null,
            "ref_type":"owned",
            "ref": null,
            "list_id": null,
            "meta": null};
    if(args){

        Object.assign(obj, args);
    }
    

    // setTimeout(null,5);
    return obj;
}

