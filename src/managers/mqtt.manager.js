const mqtt = require('mqtt');
const { MQTT_URL } = require('../config');

const client = mqtt.connect(MQTT_URL);

client.on('connect', () => {
  console.info('MQTT - CONNECTED');
});

module.exports = {
  client,
};
