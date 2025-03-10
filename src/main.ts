import { Client } from "https://deno.land/x/mqtt@0.1.2/deno/mod.ts"

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

type SwitchStateReponse = {
	POWER: SwitchPowerState
}

const isPowerState = (state: SwitchPowerState): state is SwitchPowerState =>
	state === "ON" || state === "OFF"

type ButtonPress = {
	event: string
	event_cnt: number
}

const powerSwitchSensorTopic = "tele/displaymax/SENSOR"
const powerSwitchStateTopic = "tele/displaymax/STATE"
const powerSwitchPowerTopic = "cmnd/displaymax/POWER"

const sleepCurrent = 0.085

const main = async () => {
	const client = new Client({ url: "mqtt://mqtt.43v.de" })

	await client.connect()

	await client.subscribe(powerSwitchSensorTopic)
	await client.subscribe(powerSwitchStateTopic)
	await client.subscribe(powerSwitchPowerTopic)

	let displayPower: undefined | SwitchPowerState = undefined
	let lastEnergy: undefined | SwitchSensorResponse["ENERGY"] = undefined

	const handleSensorUpdate = (sensor: SwitchSensorResponse) => {
		console.log(
			`Power: ${sensor.ENERGY.Power}W Current: ${sensor.ENERGY.Current}A Voltage: ${sensor.ENERGY.Voltage}V`,
		)

		if (displayPower === undefined) {
			displayPower = sensor.ENERGY.Current > 0 ? "ON" : "OFF"
			console.log(`guessed Display power: ${displayPower}`)
		}

		if (
			sensor.ENERGY.Current < sleepCurrent &&
			displayPower === "ON" &&
			(lastEnergy?.Current ?? 1) < sleepCurrent &&
			lastEnergy?.Current !== 0
		) {
			setSwitchPowerState("OFF")
		}

		lastEnergy = sensor.ENERGY
	}

	const handleStateUpdate = (state: SwitchStateReponse) => {
		const newState = isPowerState(state.POWER) ? state.POWER : "ON"
		if (newState !== displayPower) {
			console.log(`new display power state: ${newState}`)
		}
		displayPower = newState
	}

	const setSwitchPowerState = async (state: SwitchPowerState) => {
		await client.publish(powerSwitchPowerTopic, state)
		lastEnergy = undefined
	}

	const handleSwitchPowerState = (state: SwitchPowerState) => {
		console.log(`new power state: ${state}`)
		displayPower = state
	}

	client.on("message", (topic: string, payload: Uint8Array) => {
		const stringPayload = new TextDecoder().decode(payload)

		switch (topic) {
			case powerSwitchSensorTopic:
				handleSensorUpdate(JSON.parse(stringPayload))
				break
			case powerSwitchPowerTopic:
				handleSwitchPowerState(
					isPowerState(stringPayload) ? stringPayload : "OFF",
				)
				break
			case powerSwitchStateTopic:
				handleStateUpdate(JSON.parse(stringPayload))
				break
			default:
				console.log(`Unknown topic: ${topic} ${stringPayload}`)
		}
	})
}

await main()
