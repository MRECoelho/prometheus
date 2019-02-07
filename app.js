var url = require('url');
var path = require('path');
var sqlite3 = require('sqlite3');
var logic = require('./logic.js');

let contentDiv = document.querySelector("div.content");
let keyoutput = document.querySelector("div.keyoutput");

logic.init((resp)=>{
    resp.map(nodeObj=>{
        let node = parseNodeFromDBToDOM(nodeObj);
        console.log(nodeObj, node);
        if(nodeObj['parent_id']===0){
            contentDiv.appendChild(node);
            node.addEventListener("keydown", keydown, false);
            // node.addEventListener("mousemove", (e) => {sm.handle(e, hoverFn)}, false) // mouse over for when moving nodes
            // node.addEventListener("keypress", keypress, false);
        }else{
            let parentNode = document.getElementById(nodeObj['parent_id']);
            // node.getElementsByClassName("name")[0].addEventListener("input", onchangeFn, false)
            parentNode.querySelector("div.children").appendChild(node);
        }
    })
});

class StateMachine {

    constructor(){
        
        self.oldElem;
        self.insertionAfter;
    }


    handle(e, fn){
        // let border = fn(e);
        
        if(self.oldElem){   
            console.log("reset", self.oldElem)
            self.oldElem.style.borderBottom = "";
            self.oldElem.style.borderTop = "";
        }

        let x = e.pageX, y = e.pageY;
        let elem = document.elementFromPoint(x, y);
        
        if (((y - elem.offsetTop) / elem.offsetHeight) < 0.5){
            elem.style.borderTop = "#F00 solid 2px";
            self.insertionAfter = false; 
        }else{
            elem.style.borderBottom ="#F00 solid 2px";
            self.insertionAfter = true; 
        }
        
        self.oldElem = elem;

    }
}


let sm = new StateMachine();

function onchangeFn(e){
    console.log("onchange was called with: ",e, e.target.innerText)

          
            if((e.key !== "Enter" && !e.ctrlKey) && !e.shiftKey){
            let div = e.srcElement
            let node = div.parentNode;
            if (div.classList.contains("name")){

                // setTimeout(()=>{


                    let p = new Promise((resolve, reject) =>{
                        
                                        
                        
                                            // console.log("inputting: ", div.innerText)
                                            var updateArgs = new Map();
                                            var conditionArgs = new Map();
                                            updateArgs.set("name", div.innerText);
                                            conditionArgs.set("id", Number(node.id));
                                            let args = {"updateArgs": updateArgs, "conditionArgs": conditionArgs}
                                            
                                            logic.applyForSaveName(node.id, args).then((x) =>{ console.log("succes")}).catch()
                        
                                        }
                                    )

                // }, 10)

                }

        }
}

function hoverFn(e){
    // ((e.pageY - e.target.offsetTop) / e.target.offsetHeight) < 0.5?
    // console.log("hoverFn at top") : console.log("hoverFn at bottom")
    let x = e.pageX, y = e.pageY;
    let elem = document.elementFromPoint(x, y);
    // console.log(elem);

    

    if (((y - elem.offsetTop) / elem.offsetHeight) < 0.5){
        return elem.style.borderTop 
    }else{
        return elem.style.borderBottom;
    }
}

let parseNodeFromDBToDOM = (obj)=>{
    var nodeDiv = document.createElement('div');
    obj['class_list'].split(" ").forEach(classItem => {nodeDiv.classList.add(classItem);});
    if (obj["completed"] === 1){
        nodeDiv.classList.add("completed");
    }
    nodeDiv.id = String(obj["id"]);
    var nodeHandleDiv = document.createElement('div');
    nodeHandleDiv.classList.add("node-handle");
    var nameDiv = document.createElement('div');
    nameDiv.classList.add("name");
    nameDiv.innerText = obj['name'];
    nameDiv.contentEditable = "true";
    nameDiv.addEventListener("input", onchangeFn, false)

    
    var notesDiv = document.createElement('div');
    notesDiv.contentEditable = "true";
    // if(!(obj['notes'] === undefined || obj['notes'] ===null)){
        notesDiv.innerText = obj['notes'];
        // notesDiv.innerText= `note of ${nameDiv.innerText}`;
    // }
    notesDiv.classList.add("notes");
    var childrenDiv = document.createElement('div');
    childrenDiv.classList.add('children');
    nodeDiv.appendChild(nodeHandleDiv);
    nodeDiv.appendChild(nameDiv);
    nodeDiv.appendChild(notesDiv);
    nodeDiv.appendChild(childrenDiv);
    return nodeDiv;
}

function keydown(e){
    console.log("keydown", e);
    keyoutput.style.opacity = "1";

    if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        keyoutput.innerText = "ENTER";
        let sel = window.getSelection();
        let anchorNode = sel.anchorNode;
        let anchorOffset = sel.anchorOffset;
        let anchorNodeType = anchorNode.nodeType===1? "div" : "text";
        let subNode = anchorNode.nodeType===1? anchorNode : anchorNode.parentNode;
        let subNodeClass = subNode.classList;
        let node = subNode.parentNode;


        let name;
        let prevName;
        if(subNode.innerText.length> 0 && anchorNode.anchorOffset !== subNode.innerText.length){
            prevName = subNode.innerText.slice(0, anchorOffset);
            name =     subNode.innerText.slice(anchorOffset,);
        }
        let waitCommit = name? true: false;
        waitCommit = false; //TODO: 
        
        var updateArgs = new Map();
        var conditionArgs = new Map();
        updateArgs.set("name", prevName);
        conditionArgs.set("id", Number(node.id));
        
        let args = {"updateArgs": updateArgs, "conditionArgs": conditionArgs}

    
        // !!!!!!!!!!!!!!!!

        logic.applyForInsertAfter(node.id, {"name":name },args).then(
            resp =>{                
                console.log("no errors", resp);
                let parentNode = document.getElementById(resp.parent_id)
                let childrenDiv = parentNode.querySelector("div.children");
                
                childrenDiv.insertBefore(parseNodeFromDBToDOM(resp), childrenDiv.children[resp.child_nr-1])
                // update preNode
                subNode.innerText = prevName;
                window.getSelection().anchorNode.parentNode.parentNode.nextSibling.querySelector("div.name").focus();
            },fail=>{
                // report fail
                // db.exec("ROLLBACK;")
                console.log("i got this fail", fail)}
        ).catch(err=>(console.log(err)));
        
        }
           // delete
           else if (e.key === "Backspace" && !e.ctrlKey) {
            keyoutput.innerText = "BACKSPACE";
            let div = e.srcElement
            let node = div.parentNode;
            if (div.classList.contains("name") && div.innerText.length===0){
                // backspace is pressed and the name div has no text, apply for deleteion


                logic.applyForNodeDeletion(node.id).
                then((x)=>{console.log("succes")
                node.parentNode.removeChild(node);
            } ).
                catch((x)=>{console.log("err: ",x)})



        }
    }
    // indent
    else if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey ) {
        e.preventDefault();
        keyoutput.innerText = "TAB";
        let div = e.srcElement
        let node = div.parentNode;
        console.log("tab", node, node.id)
        logic.applyForIndentNode(node.id).then(obj =>{console.log(obj);
            console.log(obj.updateArgs, document.getElementById(obj.parent_id), document.getElementById(obj.parent_id).querySelector("div.children"), node);

            document.getElementById(obj.updateArgs.get("parent_id")).querySelector("div.children").appendChild(node);
            div.focus();
            // node.parentNode.removeChild(node);
        }, fail=>{console.log(fail)})

    }
    //un indent
    else if (e.key === "Tab" && e.shiftKey && !e.ctrlKey ) {
        e.preventDefault();
        // logic.indentNode(node.id)
        keyoutput.innerText = "TAB SHIFT (unindent)";
        let div = e.srcElement
        let node = div.parentNode;
        console.log("shift tab", node, node.id)
        logic.applyForUnindentNode(node.id).then(obj =>{console.log(obj);
            console.log(obj.updateArgs, document.getElementById(obj.parent_id), document.getElementById(obj.parent_id).querySelector("div.children"), node);


            
            document.getElementById(obj.updateArgs.get("parent_id")).querySelector("div.children").insertBefore(node, node.parentNode.parentNode.nextSibling );
            div.focus();
            // node.parentNode.removeChild(node);
        }, fail=>{console.log("failed: ",fail)})
    
    }
    else if(e.key ==="ArrowUp"){
        let carPos = window.getSelection().anchorOffset;
        // let divLength = e.target.innerText.length;
        if(carPos === 0){
            if(e.target.classList.contains("name")){
            let node = e.target.parentNode;
            let  filtered = collapsedFiltered();
            let prevNode = prevOf(filtered, node);
            prevNode.querySelector("div.name").focus();
            }else if(e.target.classList.contains("notes")){
                node.focus();
            }
        }
    }
    else if(e.key ==="ArrowDown"){
        let carPos = window.getSelection().anchorOffset;
        let divLength = e.target.innerText.length;
        if(carPos === divLength){
            let node = e.target.parentNode;
            let  filtered = collapsedFiltered();
            let nextNode = nextOf(filtered, node);
            nextNode.querySelector("div.name").focus();
        }
    }

    else if(e.key==="m" && e.ctrlKey){
        e.preventDefault();
        keyoutput.innerText = "CTRL + M";
        let div = e.srcElement;
        let node = div.parentNode;
        logic.toggleComplete(node.id)
        .then(ok =>{
            console.log("succes", ok);
                if(node.classList.contains("completed")){

                    node.classList.remove("completed")
                }else{
                    node.classList.add("completed")

                }
        }, err=>{console.log(err);})
    }


        // power indent

        
        // power unindent


        // fold / unfold
        else if(e.key ==="f" && e.ctrlKey){
            //toggle fold
            e.preventDefault();
        // logic.indentNode(node.id)
            keyoutput.innerText = "CTRL + F";
            let div = e.srcElement
            let node = div.parentNode;
            logic.toggleCollapse(node.id)
            .then(succes => { 
                console.log("succes", succes);
                if(node.classList.contains("collapsed")){
                    node.classList.add("uncollapsed")
                    node.classList.remove("collapsed")
                }else{
                    node.classList.add("collapsed")
                    node.classList.remove("uncollapsed")
                }
            
            }, fail =>{console.log("fail", fail)});
            
        }

        
        // enable notes while in notes( check for esc to save and set caret at its name)


        // move to next node

        
        // move to previous


        // power move to prev sib node

        // power move to next sib node

        // power move to parent

        setTimeout(function () {
            keyoutput.innerText = "";
            keyoutput.style.opacity = "0";
        }, 800);
}

function keypress(e){
    console.log("keypress ",e)
    // keyoutput.style.opacity = "1";
    
     




    }

    const prevOf = (arr, item)=>{
        return arr[Math.max(arr.indexOf(item)-1, 0)];
    }

    const nextOf = (arr, item)=>{
        return arr[Math.min(arr.indexOf(item)+1, arr.length-1)];
    }

    function collapsedFiltered(){
        let nodeArr = [].slice.call(document.getElementsByClassName("root")[0].getElementsByClassName("node"))
        let skipUntil;
        return nodeArr.filter((fnode)=>{
            if(skipUntil){
                if(fnode===skipUntil){
                    skipUntil=null;
                    return fnode;
                }
            }else{
                if(fnode.classList.contains("collapsed")){
                    skipUntil = fnode.nextSibling? fnode.nextSibling: fnode;
                }
                return fnode;
            }
        })
    }