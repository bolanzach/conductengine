# Conduct Engine

#### Who says you can't have a game engine in Typescript

Fully networked 3D game engine that runs in your browser.

## Getting Started

**We use `yarn`**
```shell
yarn install
```

**Start a local development running game**
```shell
yarn dev
```

In a WebGPU supported browser (unfortunately, just Chrome) navigate to `localhost:6969`.

## Features

ECS - [Entity Component System](src/conduct-ecs/README.md)


finish this function.
we need to calculate the future Date in which to create a shipment.
we must estimate at which date the totalWeight + growthRate will exceed or equal to the site.capacity.maxWeight.
The future estimated date must not exceed the earliestPickupDate + site.pickupFrequency.
