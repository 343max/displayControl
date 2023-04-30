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

const main = async () => {
  const client = new Client({ url: "mqtt://nuc.fritz.box" })

  await client.connect()

  const powerSwitchSensorTopic = "tele/displaymax/SENSOR"
  const powerSwitchPowerTopic = "cmnd/displaymax/POWER"
  const buttonPressTopic = "shellies/maxdisplay-button/input_event/0"

  await client.subscribe(powerSwitchSensorTopic)
  await client.subscribe(powerSwitchPowerTopic)
  await client.subscribe(buttonPressTopic)

  const handleSensorUpdate = (json: SwitchSensorResponse) => {
    console.log(`Power: ${json.ENERGY.Power}W`)
  }

  const handleButtonPress = (json: ButtonPress) => {
    console.log("Button pressed")
  }

  const handleSwitchPowerState = (state: SwitchPowerState) => {
    console.log(`Switch power state: ${state}`)
  }

  client.on("message", (topic: string, payload: Uint8Array) => {
    const stringPayload = new TextDecoder().decode(payload)

    console.log(`Received message: ${topic} ${stringPayload}`)

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
