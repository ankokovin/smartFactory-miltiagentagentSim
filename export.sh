rm -fr ./dist/source_server.txt
print_source() {
    echo -en "\n//Code: $1\n" >> ./dist/source_server.txt
    cat $1 >> ./dist/source_server.txt
}
print_source ./server.ts
print_source ./src/Environment.ts
print_source ./src/EnvironmentSettings.ts
print_source ./src/Message.ts
print_source ./src/utils.ts
print_source ./src/agents/Customer.ts
print_source ./src/agents/Designer.ts
print_source ./src/agents/Holder.ts
print_source ./src/agents/LogisticRobot.ts
print_source ./src/agents/Process.ts
print_source ./src/agents/ProductionRobot.ts
print_source ./src/agents/Provider.ts
print_source ./src/data/material/Detail.ts
print_source ./src/data/material/Product.ts
print_source ./src/data/material/Resource.ts
print_source ./src/data/material/ResourceOrder.ts
print_source ./src/data/process/Capability.ts
print_source ./src/data/process/ProcessData.ts
print_source ./src/data/process/ProcessInput.ts
print_source ./src/data/process/ProcessOutput.ts
print_source ./src/data/types/DetailType.ts
print_source ./src/data/types/ProcessType.ts
print_source ./src/data/types/ProductionRobotType.ts
print_source ./src/data/types/ProductType.ts
print_source ./src/data/types/ResourceType.ts
print_source ./src/data/Order.ts
print_source ./src/data/Point.ts
print_source ./src/interfaces/IAgent.ts
print_source ./src/interfaces/ILocatable.ts
print_source ./src/interfaces/IMovable.ts

rm -fr ./dist/source_front.txt
print_source_2() {
    echo -en "\n//$1\n" >> ./dist/source_front.txt
    cat $1 >> ./dist/source_front.txt
}

print_source_2 ./public/js/index.js
print_source_2 ./public/index.html
print_source_2 ./public/css/index.css