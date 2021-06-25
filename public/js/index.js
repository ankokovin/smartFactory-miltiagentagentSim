console.log('hello, world')
let canvas = document.getElementById('state')
console.log(canvas)
let ctx = canvas.getContext('2d');

let socket = new WebSocket(location.href.replace(/^https?:\/\//i, "ws://"));

socket.onmessage = function (message) {
    console.log(message);
    let data = JSON.parse(message.data)
    if (data.topic === 'iteration') {
        clear()
        document.getElementById('turn').innerText = `${data.content.current}/${data.content.total}`
    }
    if (data.topic === 'agents' 
        || data.topic === 'customer' 
        || data.topic === 'logisticRobots' 
        || data.topic === 'productionRobots' 
        || data.topic === 'provider') {
        handleAgents(data.content)
    }
    if (data.topic === 'orders') {
        handleOrders(data.content)
    }
    if (data.topic === 'processes') {
        handleProcesses(data.content)
    }
    if (data.topic === 'Done') {
        clear()
        toggleDissabled()
    }
}

socket.onopen = function() {
    //socket.send('hello');
}

let started = false

function toggleDissabled() {
    document.getElementById('start').toggleAttribute('disabled')
    document.getElementById('stop').toggleAttribute('disabled')
    
    document.getElementById('orderProbability').toggleAttribute('disabled')
    document.getElementById('iter').toggleAttribute('disabled')
    document.getElementById('ProductionRobot').toggleAttribute('disabled')
    document.getElementById('LogisticRobot').toggleAttribute('disabled')
    document.getElementById('noDelay').toggleAttribute('disabled')
    started = !started
}

function start() {
    console.log('start');
    let delay = oNoDelay.checked ? 0 : document.getElementById('delay').value
    let iter = new Number(document.getElementById('iter').value)

    let productionRobotCount = new Number(document.getElementById('ProductionRobot').value)
    let logisticRobotCount = new Number(document.getElementById('LogisticRobot').value)
    let logisticRobotSpeed = new Number(document.getElementById('LogisticRobotSpeed').value)


    let orderProbability = new Number(document.getElementById('orderProbability').value)

    let config = {delay, iter, productionRobotCount, logisticRobotCount, orderProbability, logisticRobotSpeed, isStart:true}
    socket.send(JSON.stringify(config));
    toggleDissabled()
}

function stop() {
    socket.send(JSON.stringify({isStop: true}))
    toggleDissabled()
}

function handleAgents(agents) {
    console.log(agents)
    drawAgents(agents)
    legend(agents)
}

function getAgentStyle(type) {
    if (type === 'LogisticRobot') return 'rgb(0, 200, 0)'
    if (type === 'ProductionRobot') return 'red'
    if (type === 'Provider') return 'yellow'
    if (type === 'Customer') return 'blue'
    return 'rgb(255, 255, 255)'
}

function getAgentSize(type) {
    if (type === 'Provider') return 20
    if (type === 'Customer') return 20
    if (type === 'ProductionRobot') return 10
    return 5
}

function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'lightgray';
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fill();
}

function agentType(agent) {
    return agent.id.split('-')[0]
}

function drawAgents(agents) {
    agents
        .filter(agent => agent.position)
        .map(agent => {
            return {
                type: agentType(agent),
                point: agent.position,
                target: agent.target
            }
        }).forEach(element => {
            drawAgent(element)  
        });
}

function drawAgent(agent) {
    console.log(agent)
    const size = getAgentSize(agent.type);
    const point = agent.point;
    ctx.fillStyle = getAgentStyle(agent.type);
    ctx.fillRect(point.x - size, point.y - size, 2*size, 2*size);
    if (agent.type === 'LogisticRobot' && agent.target) {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(agent.target.x, agent.target.y);
        ctx.stroke();
    }
}

function legend(agents) {
    const type = agentType(agents[0])
    let oListItem = document.getElementById(`legend-${type}`)
    if (!oListItem) {
        oListItem = document.createElement('li',)
        oListItem.id = `legend-${type}`
        oListItem.classList.add("list-group-item")
        oListItem.style = `background-color:${getAgentStyle(type)}`
        oListItem.innerText = type
        document.getElementById('legend').appendChild(oListItem)
    }
    
}


function handleOrders(orders) {
    console.log(orders);
    document.getElementById('orders-total').innerText = new String(orders.total);
    document.getElementById('orders-done').innerText = new String(orders.done);
}

function handleProcesses(processes) {
    console.log(processes);

    function handle(category, processes) {
        const idPrefix = `processes${category ? '-' + category : ''}`
        console.log(idPrefix)
        document.getElementById(`${idPrefix}-total`).innerText = new String(processes.total);
        document.getElementById(`${idPrefix}-manufatured`).innerText = new String(processes.manufatured);
        document.getElementById(`${idPrefix}-done`).innerText = new String(processes.done);
        document.getElementById(`${idPrefix}-started`).innerText = new String(processes.started); 
    }
    
    handle(false, processes.all);
    handle('primitive', processes.primitive);
    handle('simple', processes.simple);
    handle('parents', processes.parents);
    handle('children', processes.children);
}

let oOrderProb = document.getElementById('orderProbability')
let oOrderProbVal = document.getElementById('orderProbability-value')
oOrderProb.addEventListener('change', (event) => {
    oOrderProbVal.textContent = `${event.target.value}`;
  });

let odelay = document.getElementById('delay')
let oSpeeedVal = document.getElementById('delay-value')
odelay.addEventListener('change', (event) => {
    oSpeeedVal.textContent = event.target.value;
    if (started) {
        socket.send(JSON.stringify({delay: new Number(event.target.value)}))
    }
});
let oNoDelay = document.getElementById('noDelay')
oNoDelay.addEventListener('change', (event) => {
    if ( event.target.checked) {
        oSpeeedVal.textContent = ': no'
    } else {
        oSpeeedVal.textContent = odelay.value
    }
    odelay.toggleAttribute('disabled')
})