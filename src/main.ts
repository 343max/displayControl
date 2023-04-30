import { Client } from "https://deno.land/x/mqtt/deno/mod.ts"

type SwitchSensorResponse = {
  Time: string
  ENERGY: {
    TotalStartTime: string
    Total: number
    Yesterday: number
    Today: number
    Period: number
    Power: number
    ApparentPower: number
    ReactivePower: number
    Factor: number
    Voltage: number
    Current: number
  }
}

type SwitchPowerState = "ON" | "OFF"

type ButtonPress = {
  event: string
  event_cnt: number
}

const powerSwitchSensorTopic = "tele/displaymax/SENSOR"
const powerSwitchPowerTopic = "cmnd/displaymax/POWER"
const buttonPressTopic = "shellies/maxdisplay-button/input_event/0"

const sleepCurrent = 0.085

const main = async () => {
  const client = new Client({ url: "mqtt://nuc.fritz.box" })

  await client.connect()

  await client.subscribe(powerSwitchSensorTopic)
  await client.subscribe(powerSwitchPowerTopic)
  await client.subscribe(buttonPressTopic)

  let displayPower: undefined | SwitchPowerState = undefined
  let lastEnergy: undefined | SwitchSensorResponse["ENERGY"] = undefined

  const handleSensorUpdate = (sensor: SwitchSensorResponse) => {
    console.log(
      `Power: ${sensor.ENERGY.Power}W Current: ${sensor.ENERGY.Current}A Voltage: ${sensor.ENERGY.Voltage}V`
    )

    if (displayPower === undefined) {
      displayPower = sensor.ENERGY.Current > 0 ? "ON" : "OFF"
      console.log(`guessed Display power: ${displayPower}`)
    }

    if (
      (sensor.ENERGY.Current < sleepCurrent &&
        displayPower === "ON" &&
        lastEnergy?.Current) ??
      1 < sleepCurrent
    ) {
      setSwitchPowerState("OFF")
    }

    lastEnergy = sensor.ENERGY
  }

  const handleButtonPress = async (press: ButtonPress) => {
    if (press.event === "S") {
      await setSwitchPowerState(displayPower === "ON" ? "OFF" : "ON")
    }
  }

  const setSwitchPowerState = async (state: SwitchPowerState) => {
    await client.publish(powerSwitchPowerTopic, state)
  }

  const handleSwitchPowerState = (state: SwitchPowerState) => {
    console.log(`new power state: ${state}`)
    displayPower = state
  }

  client.on("message", (topic: string, payload: Uint8Array) => {
    const stringPayload = new TextDecoder().decode(payload)

    // console.log(`Received message: ${topic} ${stringPayload}`)

    switch (topic) {
      case powerSwitchSensorTopic:
        handleSensorUpdate(JSON.parse(stringPayload))
        break
      case buttonPressTopic:
        handleButtonPress(JSON.parse(stringPayload))
        break
      case powerSwitchPowerTopic:
        handleSwitchPowerState(stringPayload as SwitchPowerState)
        break
      default:
        console.log(`Unknown topic: ${topic} ${stringPayload}`)
    }
  })
}

await main()
