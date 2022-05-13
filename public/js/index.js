let canvas = document.getElementById('state')
let ctx = canvas.getContext('2d');


let Environment = null
let send = null
let env = null
let logisticRobots = []
let productionRobots = []
let customers = []
let providers = []
let holders = []
let drawId = null
import('./environment/Environment.js')
    .then(x => {
        Environment = x.default
        return import('./environment/utils.js')
    })
    .then(util => {
        send = (message) => {
            env = util.handleMessage(message, env, (obj) => onNewMessage({data: JSON.stringify(obj)}))
        }
    })
    .catch((err) => {
        console.log(err)
        let socket = new WebSocket(location.href.replace(/^https?:\/\//i, "ws://"));
        socket.onmessage = onNewMessage
        send = (message) => socket.send(message)
    })

function onNewMessage(message) {
    let data = JSON.parse(message.data)
    if (data.topic === 'debug') {
        console.log(data.content)
    }
    if (data.topic === 'iteration') {
        document.getElementById('turn').innerText = `${data.content.current}/${data.content.total}`
    }
    if (data.topic === 'time') {
        const totalSeconds = Math.floor(data.content)
        const days =  Math.floor(totalSeconds / (24 * 60 * 60))
        let hours =   Math.floor(totalSeconds / (60 * 60) - days * 24)
        let minutes = Math.floor(totalSeconds / 60 - days * 60 * 24 - hours * 60)
        let seconds = Math.floor(totalSeconds - days * 60 * 60 * 24 - hours * 60 * 60 - minutes * 60)
        if (hours < 10)     hours = "0" + hours
        if (minutes < 10)   minutes = "0" + minutes
        if (seconds < 10)   seconds = "0" + seconds
        
        document.getElementById('time').innerText = `${days ? days + ' дней ' : ''}${hours}:${minutes}:${seconds}`
    }
    if (data.topic === 'customer') {
        handleCustomer(data.content)
    }
    if (data.topic === 'logisticRobots') {
        handleLogisticRobots(data.content)
    } 
    if (data.topic === 'productionRobots') {
        handleProductionRobots(data.content)
    } 
    if (data.topic === 'provider') {
        handleProviders(data.content)
    } 
    if (data.topic === 'holders') {
        handleHolders(data.content)
    }
    if (data.topic === 'orders') {
        handleOrders(data.content)
    }
    if (data.topic === 'processes') {
        handleProcesses(data.content)
    }
    if (data.topic === 'customerCreatedModels') {
        handleCustomerCreatedModels(data.content)
    }
    if (data.topic === 'designsInWorks') {
        handleDesignsInWorks(Object.fromEntries(data.content))
    }
    if (data.topic === 'designsInQueue') {
        handleDesignInQueue(data.content)
    }
    if (data.topic === 'designsDone') {
        handleDesignDone(Object.fromEntries(data.content))
    }
    if (data.topic === 'Done') {
        cancelAnimationFrame(drawId)
        clear()
        toggleDissabled()
    }
}

let started = false

function toggleDissabled() {
    document.getElementById('start').toggleAttribute('disabled')
    document.getElementById('stop').toggleAttribute('disabled')
    document.getElementById('HolderCount').toggleAttribute('disabled')
    document.getElementById('iter').toggleAttribute('disabled')
    document.getElementById('ProductionRobot').toggleAttribute('disabled')
    document.getElementById('LogisticRobot').toggleAttribute('disabled')
    document.getElementById('noDelay').toggleAttribute('disabled')
    started = !started
}

function getStartEndTime(elementIdPrefix) {
    const getMultiplyer = (middle) => {
        const val = document.getElementById(elementIdPrefix + middle + 'Unit').value
        if (val === 'seconds')  return 1
        if (val === 'minutes')  return 60
        if (val === 'hours'  )  return 60 * 60
        if (val === 'days'   )  return 60 * 60 * 24
        return 1
    }
    return {
        start: new Number(document.getElementById(elementIdPrefix + 'Start').value) * getMultiplyer('Start'),
        end: new Number(document.getElementById(elementIdPrefix + 'End').value) * getMultiplyer('End'),
        isDiscrete: false
    }
}

function getStartEndInt(elementIdPrefix) {
    return {
        start: new Number(document.getElementById(elementIdPrefix + 'Start').value),
        end: new Number(document.getElementById(elementIdPrefix + 'End').value),
        isDiscrete: true
    }
}

function getNumber(elementId) {
    return new Number(document.getElementById(elementId).value)
}

function getConfig() {
    let delay = oNoDelay.checked ? 0 : (1000 - document.getElementById('delay').value)

    return {
        delay, 
        iter: getNumber('iter'), 
        productionRobots: {
            count:      getNumber('ProductionRobot'),
            typeCount:  getNumber('ProductionRobotTypeCount'),
            duration:      getStartEndTime('productionRobotDuration')
        }, 
        logisticRobots: {
            count:      getNumber('LogisticRobot'),
            speed:      getNumber('LogisticRobotSpeed'),
        },
        isStart:true,
        holderCount: getNumber('HolderCount'),
        defaultInternalEventDelay: getStartEndTime('defaultInternalEventDelay'),
        defaultCommunicationDelay: getStartEndTime('defaultCommunicationDelay'),
        customer: {
            newOrderDistribution: getStartEndTime('newOrder'),
            startOrderProportion: {
                text:       getNumber('orderTypeWeightText'),
                image:      getNumber('orderTypeWeightImage'),
                cad:        getNumber('orderTypeWeightCAD'),
                process:    getNumber('orderTypeWeightProcess')
            }
        },
        processMaker: {
            processMakerInputCount:             getStartEndInt('processMakerInputCount'),
            processMakerInputQuantity:          getStartEndInt('processMakerInputQuantity'),
            processMakerOutputQuantity:         getStartEndInt('processMakerOutputQuantity'),
            processMakerPrimitiveProbability:   getNumber('processMakerPrimitiveProbability'),
        },
        process: {
            responseTimeoutDelay:   getStartEndTime('processResponseTimeoutDelay'),
            planRetryDelay:         getStartEndTime('processPlanRetryDelay')
        },
        planner: {
            duration: {
                text: getStartEndTime('textModelDuration'),
                image: getStartEndTime('imageModelDuration'),
                CAD: getStartEndTime('CADModelDuration')
            },
            count: getNumber('PlannersCount')
        },
        detailTypeCount: getNumber('detailTypeCount'),
        resourceTypeCount: getNumber('resourceTypeCount'),
    }
}

function start() {
    let config = getConfig()
    console.log(config)
    send(JSON.stringify(config));
    toggleDissabled()
    drawId = requestAnimationFrame(draw)
}

function draw() {
    let agents = [...logisticRobots, ...productionRobots, ...customers, ...providers, ...holders]
    clear()
    drawAgents(agents);
    drawId = requestAnimationFrame(draw);
}

function stop() {
    send(JSON.stringify({isStop: true}))
    toggleDissabled()
    cancelAnimationFrame(drawId)
}

function handleCustomer(nCustomers) {
    customers = nCustomers;
    legend(customers)
}

function handleLogisticRobots(nLogisticRobots) {
    logisticRobots = nLogisticRobots;
    legend(logisticRobots)
}

function handleProductionRobots(nProductionRobots) {
    productionRobots = nProductionRobots;
    legend(productionRobots)
}

function handleProviders(nProviders) {
    providers = nProviders;
    legend(providers)
}

function handleHolders(nHolders) {
    holders = nHolders;
    legend(holders)
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

function friendlyTypeName(type) {
    if (type === 'LogisticRobot') return 'Логистические роботы'
    if (type === 'ProductionRobot') return 'Производители'
    if (type === 'Provider') return 'Поставщик'
    if (type === 'Customer') return 'Заказчик'
    if (type === 'Holder') return 'Хранение'
    return type
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
        oListItem.innerText = friendlyTypeName(type)
        document.getElementById('legend-list').appendChild(oListItem)
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
    handle('parents', processes.parents);
    handle('children', processes.children);
}

function handleCustomerCreatedModels(customerModelsCount) {
    document.getElementById('text-models-received').innerText = customerModelsCount['0']
    document.getElementById('image-models-received').innerText = customerModelsCount['1']
    document.getElementById('cad-models-received').innerText = customerModelsCount['2']
    document.getElementById('total-models-received').innerText = obj['0'] + obj['1'] + obj['2']
}

function handleDesignsInWorks(obj) {
    document.getElementById('text-models-in-progress').innerHTML = obj['0']
    document.getElementById('image-models-in-progress').innerText = obj['1']
    document.getElementById('cad-models-in-progress').innerText = obj['2']
    document.getElementById('total-models-in-progress').innerText = obj['0'] + obj['1'] + obj['2']
}

function handleDesignInQueue(obj) {
    document.getElementById('text-models-in-queue').innerHTML = obj['0']
    document.getElementById('image-models-in-queue').innerText = obj['1']
    document.getElementById('cad-models-in-queue').innerText = obj['2']
    document.getElementById('total-models-in-queue').innerText = obj['0'] + obj['1'] + obj['2']
}

function handleDesignDone(obj) {
    document.getElementById('text-models-done').innerHTML = obj['0']
    document.getElementById('image-models-done').innerText = obj['1']
    document.getElementById('cad-models-done').innerText = obj['2']
    document.getElementById('total-models-done').innerText = obj['0'] + obj['1'] + obj['2']
}

let odelay = document.getElementById('delay')
let oSpeeedVal = document.getElementById('delay-value')
odelay.addEventListener('change', (event) => {
    oSpeeedVal.textContent = event.target.value;
    if (started) {
        send(JSON.stringify({delay: new Number(1000 - event.target.value)}))
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
document.getElementById('ProductionRobot').addEventListener('change', (event) => {
    const newValue = event.target.value
    const typeCountElement = document.getElementById('ProductionRobotTypeCount')
    typeCountElement.setAttribute('max', newValue)
    typeCountElement.value = Math.min(newValue, typeCountElement.value)
    console.log(event)
})

function createRandomIntervalInput({name, defaultStart, defaultEnd}) {
    const template = document.querySelector('#randomIntervalTemplate')
    let clone = template.content.cloneNode(true)
    const makeInput = (defaults, postfix) => {
        const element = clone.querySelector('.randomIntervalTemplate' + postfix)
        const label = element.querySelector('label')
        label.setAttribute('for', name + postfix)
        const input = element.querySelector('input')
        input.setAttribute('name', name + postfix)
        input.setAttribute('id', name + postfix)
        input.setAttribute('value', defaults.value)
        const unit = element.querySelector('select')
        unit.setAttribute('id', name + postfix + 'Unit')
        unit.setAttribute('name', name + postfix + 'Unit')
        const getSelectIndex = (unit) => {
            if (unit === 'seconds') return 0
            if (unit === 'minutes') return 1
            if (unit === 'hours') return 2
            if (unit === 'days') return 3
            return 0
        }
        unit.options[getSelectIndex(defaults.unit)].selected = true
    }
    makeInput(defaultStart, 'Start')
    makeInput(defaultEnd,   'End')

    return clone
}

function createRandomIntIntervalInput({name, defaultStart, defaultEnd}) {
    const template = document.querySelector('#randomIntIntervalTemplate')
    let clone = template.content.cloneNode(true)
    const makeInput = (defaults, postfix) => {
        const element = clone.querySelector('.randomIntIntervalTemplate' + postfix)
        const label = element.querySelector('label')
         label.setAttribute('for', name + postfix)
        const input = element.querySelector('input')
        input.setAttribute('name', name + postfix)
        input.setAttribute('id', name + postfix)
        input.setAttribute('value', defaults.value)
    }
    makeInput(defaultStart, 'Start')
    makeInput(defaultEnd, 'End')

    return clone
}

const inputParams = [
    {
        name:'defaultInternalEventDelay',
        isTime: true,
        defaultStart: {
            value: 0.01, 
            unit: 'seconds'
        },
        defaultEnd: {
            value: 0.02,
            unit: 'seconds'
        }
    }, {
        name:'defaultCommunicationDelay',
        defaultStart: {
            value: 0.5,
            unit: 'seconds'
        },
        defaultEnd: {
            value: 2,
            unit: 'seconds'
        },
        isTime: true
    }, {
        name:'processPlanRetryDelay',
        defaultStart: {
            value: 1,
            unit: 'minutes'
        },
        defaultEnd: {
            value: 2,
            unit: 'minutes'
        },
        isTime: true
    },  {
        name:'processResponseTimeoutDelay',
        defaultStart: {
            value: 5,
            unit: 'seconds'
        },
        defaultEnd: {
            value: 10,
            unit: 'seconds'
        },
        isTime: true
    },  {
        name:'newOrder',
        defaultStart: {
            value: 10,
            unit: 'minutes'
        },
        defaultEnd: {
            value: 1,
            unit: 'hours'
        },
        isTime: true
    }, {    
        name:'processMakerInputCount',
        defaultStart: {
            value: 1
        },
        defaultEnd: {
            value: 5
        },
        isTime: false
    }, {
        name:'processMakerInputQuantity',
        defaultStart: {
            value: 1
        },
        defaultEnd: {
            value: 5
        },
        isTime: false
    }, {
        name:'processMakerOutputQuantity',
        defaultStart: {
            value: 1
        },
        defaultEnd: {
            value: 5
        },
        isTime: false
    }, {
        name:'textModelDuration',
        defaultStart: {
            value: 10,
            unit: 'minutes'
        },
        defaultEnd: {
            value: 8,
            unit: 'hours'
        },
        isTime: true
    },  {
        name:'imageModelDuration',
        defaultStart: {
            value: 1,
            unit: 'hours'
        },
        defaultEnd: {
            value: 8,
            unit: 'hours'
        },
        isTime: true
    },  {
        name:'CADModelDuration',
        defaultStart: {
            value: 1,
            unit: 'minutes'
        },
        defaultEnd: {
            value: 10,
            unit: 'minutes'
        },
        isTime: true
    }, {
        name:'productionRobotDuration',
        defaultStart: {
            value: 10,
            unit: 'minutes'
        },
        defaultEnd: {
            value: 1,
            unit: 'hours'
        },
        isTime: true
    }
]

inputParams.forEach(({name, isTime, defaultStart, defaultEnd}) => {
    const element = document.querySelector('#'+name) 
    if (isTime) {
        element.append(createRandomIntervalInput({
            name, 
            defaultStart,
            defaultEnd
        }))
        return
    }
    element.append(createRandomIntIntervalInput({name, defaultStart, defaultEnd}))
})

function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function save() {
    let config = getConfig()
    download(JSON.stringify(config), 'config.json', 'text/plain')
}

document.getElementById('files').addEventListener('change', load, false);
const fr = new FileReader();
fr.onload = e => {
    const state = JSON.parse(e.target.result)

    const setNumber = (name, val) => {
        document.getElementById(name).value = val
    }

    const setStartEndInt = (name, val) => {
        document.getElementById(name + 'Start').value = val.start
        document.getElementById(name + 'End').value = val.end
    }

    const setStartEndTime = (name, val) => {
        setStartEndInt(name, val)
        document.getElementById(name + 'StartUnit').value = 'seconds'
        document.getElementById(name + 'EndUnit').value = 'seconds'
    }

    setNumber('iter', state.iter)
    setNumber('ProductionRobot', state.productionRobots.count)
    setNumber('ProductionRobotTypeCount', state.productionRobots.typeCount)
    setStartEndTime('productionRobotDuration', state.productionRobots.duration)
    setNumber('LogisticRobot', state.logisticRobots.count)
    setNumber('LogisticRobotSpeed', state.logisticRobots.speed)
    setNumber('HolderCount', state.holderCount)
    setStartEndTime('defaultInternalEventDelay', state.defaultInternalEventDelay)
    setStartEndTime('defaultCommunicationDelay', state.defaultCommunicationDelay)
    setStartEndTime('newOrder', state.customer.newOrderDistribution)
    setNumber('orderTypeWeightText', state.customer.startOrderProportion.text)
    setNumber('orderTypeWeightImage', state.customer.startOrderProportion.image)
    setNumber('orderTypeWeightCAD', state.customer.startOrderProportion.cad)
    setNumber('orderTypeWeightProcess', state.customer.startOrderProportion.process)
    setStartEndInt('processMakerInputCount', state.processMaker.processMakerInputCount )
    setStartEndInt('processMakerInputQuantity', state.processMaker.processMakerInputQuantity )
    setStartEndInt('processMakerOutputQuantity', state.processMaker.processMakerOutputQuantity )
    setNumber('processMakerPrimitiveProbability', state.processMaker.processMakerPrimitiveProbability )
    setStartEndTime('processResponseTimeoutDelay', state.process.responseTimeoutDelay )
    setStartEndTime('processPlanRetryDelay', state.process.planRetryDelay )
    setStartEndTime('textModelDuration', state.planner.duration.text )
    setStartEndTime('imageModelDuration', state.planner.duration.image )
    setStartEndTime('CADModelDuration', state.planner.duration.CAD )
    setNumber('PlannersCount', state.planner.count)
    setNumber('detailTypeCount', state.detailTypeCount)
    setNumber('resourceTypeCount', state.resourceTypeCount)
}
function load(event) {
    console.log(event)
    fr.readAsText(event.target.files[0])
}