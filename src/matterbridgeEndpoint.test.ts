/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { jest } from '@jest/globals';
import { AnsiLogger, LogLevel, TimestampFormat } from 'node-ansi-logger';

import { MatterbridgeEdge } from './matterbridgeEdge.js';
import { MatterbridgeEndpoint } from './matterbridgeEndpoint.js';
import { bridge, dimmableLight, onOffLight, onOffOutlet, onOffSwitch } from './matterbridgeDevice.js';
import { getMacAddress } from './utils/utils.js';

import { DeviceTypeId, VendorId, Environment, ServerNode, Endpoint, EndpointServer, StorageContext } from '@matter/main';
import { LogFormat as Format, LogLevel as Level } from '@matter/main';
import {
  BooleanStateCluster,
  FlowMeasurementCluster,
  IlluminanceMeasurementCluster,
  OccupancySensingCluster,
  OnOffCluster,
  PressureMeasurement,
  PressureMeasurementCluster,
  RelativeHumidityMeasurement,
  RelativeHumidityMeasurementCluster,
  TemperatureMeasurementCluster,
} from '@matter/main/clusters';
import { AggregatorEndpoint, AggregatorEndpointDefinition } from '@matter/main/endpoints';

import { DeviceTypes, logEndpoint } from '@project-chip/matter.js/device';
import { MdnsService } from '@matter/main/protocol';

describe('MatterbridgeEndpoint class', () => {
  let edge: MatterbridgeEdge;
  let context: StorageContext;
  let server: ServerNode<ServerNode.RootEndpoint>;
  let aggregator: Endpoint<AggregatorEndpoint>;
  let device: MatterbridgeEndpoint;
  let count = 1;

  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleDebugSpy: jest.SpiedFunction<typeof console.debug>;
  let consoleInfoSpy: jest.SpiedFunction<typeof console.info>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeAll(async () => {
    // Mock the AnsiLogger.log method
    jest.spyOn(AnsiLogger.prototype, 'log').mockImplementation((level: string, message: string, ...parameters: any[]) => {
      // console.log(`Mocked log: ${level} - ${message}`, ...parameters);
    });
    // Spy on and mock console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      // console.error(args);
    });
    // Spy on and mock console.log
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation((...args: any[]) => {
      // console.error(args);
    });
    // Spy on and mock console.log
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation((...args: any[]) => {
      // console.error(args);
    });
    // Spy on and mock console.log
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
      // console.error(args);
    });

    // Create a MatterbridgeEdge instance
    edge = await MatterbridgeEdge.loadInstance(false);
    edge.log = new AnsiLogger({ logName: 'Matterbridge', logTimestampFormat: TimestampFormat.TIME_MILLIS, logLevel: LogLevel.DEBUG });
    // Setup matter environment
    edge.environment.vars.set('log.level', Level.DEBUG);
    edge.environment.vars.set('log.format', Format.ANSI);
    edge.environment.vars.set('path.root', 'matterstorage');
    edge.environment.vars.set('runtime.signals', false);
    edge.environment.vars.set('runtime.exitcode', false);
    await edge.startMatterStorage('test', 'Matterbridge');
  });

  afterEach(async () => {
    // Keep the id unique
    count++;
  });

  afterAll(async () => {
    // Restore the mocked AnsiLogger.log method
    if ((AnsiLogger.prototype.log as jest.Mock).mockRestore) (AnsiLogger.prototype.log as jest.Mock).mockRestore();
    consoleLogSpy?.mockRestore();
    consoleDebugSpy?.mockRestore();
    consoleInfoSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();

    await edge.environment.get(MdnsService)[Symbol.asyncDispose]();
    edge.environment.close(MdnsService);
    if (getMacAddress() === '30:f6:ef:69:2b:c5') {
      setTimeout(() => {
        process.exit(0);
      }, 2000);
    }
  });

  describe('onOffLight with child endpoints', () => {
    const deviceType = onOffLight;

    test('create a context for server node', async () => {
      /*
      (AnsiLogger.prototype.log as jest.Mock).mockRestore();
      consoleLogSpy.mockRestore();
      consoleDebugSpy.mockRestore();
      consoleInfoSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      */
      context = await edge.createServerNodeContext('Jest', deviceType.name, DeviceTypeId(deviceType.code), VendorId(0xfff1), 'Matterbridge', 0x8000, 'Matterbridge ' + deviceType.name.replace('MA-', ''));
      expect(context).toBeDefined();
    });

    if (getMacAddress() !== '30:f6:ef:69:2b:c5') return;

    test('create the server node', async () => {
      server = await edge.createServerNode(context);
      expect(server).toBeDefined();
    });

    test('create a onOffLight device', async () => {
      server = await edge.createServerNode(context);
      device = new MatterbridgeEndpoint(deviceType, { uniqueStorageKey: 'OnOffLight with sensors' });
      expect(device).toBeDefined();
      expect(device.id).toBe('OnOffLight with sensors');
      expect(device.type.name).toBe(deviceType.name.replace('-', '_'));
      expect(device.type.deviceType).toBe(deviceType.code);
      expect(device.type.deviceClass).toBe(deviceType.deviceClass.toLowerCase());
      expect(device.type.deviceRevision).toBe(deviceType.revision);
      expect(device.type.behaviors.identify).toBeDefined();
      expect(device.type.behaviors.groups).toBeDefined();
      expect(device.type.behaviors.onOff).toBeDefined();
      // device.addClusterServer(device.getDefaultBasicInformationClusterServer('Light with sensors', '123456789', 0xfff1, 'Matterbridge', 0x8000, 'Light with sensors'));
    });

    test('add contact child to onOffLight', async () => {
      const deviceType = DeviceTypes.CONTACT_SENSOR;
      const childEndpoint = device.addChildDeviceTypeWithClusterServer('contactChild-1', [deviceType], [BooleanStateCluster.id]);
      expect(childEndpoint).toBeDefined();
      childEndpoint.addClusterServer(childEndpoint.getDefaultBooleanStateClusterServer(false));
      expect(device.getChildEndpointByName('contactChild-1')).toBeDefined();
    });

    test('add motion child to onOffLight', async () => {
      const deviceType = DeviceTypes.OCCUPANCY_SENSOR;
      const childEndpoint = device.addChildDeviceTypeWithClusterServer('occupancyChild-2', [deviceType], [OccupancySensingCluster.id]);
      expect(childEndpoint).toBeDefined();
      childEndpoint.addClusterServer(childEndpoint.getDefaultOccupancySensingClusterServer(false));
      expect(device.getChildEndpointByName('occupancyChild-2')).toBeDefined();
    });

    test('add illuminance child to onOffLight', async () => {
      const deviceType = DeviceTypes.LIGHT_SENSOR;
      const childEndpoint = device.addChildDeviceTypeWithClusterServer('illuminanceChild-3', [deviceType], [IlluminanceMeasurementCluster.id]);
      expect(childEndpoint).toBeDefined();
      childEndpoint.addClusterServer(childEndpoint.getDefaultIlluminanceMeasurementClusterServer(200));
      expect(device.getChildEndpointByName('illuminanceChild-3')).toBeDefined();
    });

    test('add temperature child to onOffLight', async () => {
      const deviceType = DeviceTypes.TEMPERATURE_SENSOR;
      const childEndpoint = device.addChildDeviceTypeWithClusterServer('temperatureChild-4', [deviceType], [TemperatureMeasurementCluster.id]);
      expect(childEndpoint).toBeDefined();
      childEndpoint.addClusterServer(childEndpoint.getDefaultTemperatureMeasurementClusterServer(2500));
      expect(device.getChildEndpointByName('temperatureChild-4')).toBeDefined();
    });

    test('add humidity child to onOffLight', async () => {
      const deviceType = DeviceTypes.HUMIDITY_SENSOR;
      const childEndpoint = device.addChildDeviceTypeWithClusterServer('humidityChild-5', [deviceType], [RelativeHumidityMeasurementCluster.id]);
      expect(childEndpoint).toBeDefined();
      childEndpoint.addClusterServer(childEndpoint.getDefaultRelativeHumidityMeasurementClusterServer(8000));
      expect(device.getChildEndpointByName('humidityChild-5')).toBeDefined();
    });

    test('add pressure child to onOffLight', async () => {
      const deviceType = DeviceTypes.PRESSURE_SENSOR;
      const childEndpoint = device.addChildDeviceTypeWithClusterServer('pressureChild-6', [deviceType], [PressureMeasurementCluster.id]);
      expect(childEndpoint).toBeDefined();
      childEndpoint.addClusterServer(childEndpoint.getDefaultPressureMeasurementClusterServer(900));
      expect(device.getChildEndpointByName('pressureChild-6')).toBeDefined();
    });

    test('add flow child to onOffLight', async () => {
      const deviceType = DeviceTypes.FLOW_SENSOR;
      const childEndpoint = device.addChildDeviceTypeWithClusterServer('flowChild-7', [deviceType], [FlowMeasurementCluster.id]);
      expect(childEndpoint).toBeDefined();
      childEndpoint.addClusterServer(childEndpoint.getDefaultFlowMeasurementClusterServer(900));
      expect(device.getChildEndpointByName('flowChild-7')).toBeDefined();
    });

    test('add onOffLight device to serverNode', async () => {
      expect(await server.add(device)).toBeDefined();
    });

    test('log onOffLight', async () => {
      expect(device).toBeDefined();
      logEndpoint(EndpointServer.forEndpoint(device));
    });
  });

  describe('Getter, setter and subscribe', () => {
    test('create a context for server node', async () => {
      const deviceType = onOffLight;
      context = await edge.createServerNodeContext('Jest', deviceType.name, DeviceTypeId(deviceType.code), VendorId(0xfff1), 'Matterbridge', 0x8000, 'Matterbridge ' + deviceType.name.replace('MA-', ''));
      expect(context).toBeDefined();
    });

    if (getMacAddress() !== '30:f6:ef:69:2b:c5') return;

    test('create a onOffLight device', async () => {
      const deviceType = onOffLight;
      server = await edge.createServerNode(context);
      device = new MatterbridgeEndpoint(deviceType, { uniqueStorageKey: deviceType.name.replace('MA-', '') + '-' + count });
      expect(device).toBeDefined();
      expect(device.id).toBe(deviceType.name.replace('MA-', '') + '-' + count);
      expect(device.type.name).toBe(deviceType.name.replace('-', '_'));
      expect(device.type.deviceType).toBe(deviceType.code);
      expect(device.type.deviceClass).toBe(deviceType.deviceClass.toLowerCase());
      expect(device.type.deviceRevision).toBe(deviceType.revision);
      expect(device.type.behaviors.identify).toBeDefined();
      expect(device.type.behaviors.groups).toBeDefined();
      expect(device.type.behaviors.onOff).toBeDefined();
    });

    test('add onOffLight device to serverNode and start', async () => {
      await server.add(device);
      await edge.startServerNode(server);
      expect(server.lifecycle.isOnline).toBe(true);
      expect(server.lifecycle.isCommissioned).toBe(false);
    });

    test('getAttribute OnOff.onOff', async () => {
      const state = (device.state as any)['onOff']['onOff'];
      expect(device.getAttribute(OnOffCluster.id, 'onOff', edge.log)).toBe(state);
    });

    test('setAttribute OnOff.onOff', async () => {
      expect(await device.setAttribute(OnOffCluster.id, 'onOff', true, edge.log)).toBe(true);
      expect(device.getAttribute(OnOffCluster.id, 'onOff', edge.log)).toBe(true);

      expect(await device.setAttribute(OnOffCluster.id, 'onOff', false, edge.log)).toBe(true);
      expect(device.getAttribute(OnOffCluster.id, 'onOff', edge.log)).toBe(false);
    });

    test('subscribeAttribute OnOff.onOff', async () => {
      expect(await device.setAttribute(OnOffCluster.id, 'onOff', true, edge.log)).toBe(true);
      let state = device.getAttribute(OnOffCluster.id, 'onOff', edge.log);

      const result = device.subscribeAttribute(
        OnOffCluster.id,
        'onOff',
        (newValue: any, oldValue: any) => {
          state = newValue;
          edge.log.warn('onOff', newValue, oldValue);
        },
        edge.log,
      );
      expect(result).toBe(true);

      expect(await device.setAttribute(OnOffCluster.id, 'onOff', false, edge.log)).toBe(true);
      expect(state).toBe(false);

      expect(await device.setAttribute(OnOffCluster.id, 'onOff', true, edge.log)).toBe(true);
      expect(state).toBe(true);
    });

    test('close serverNode', async () => {
      await edge.stopServerNode(server);
      expect(server.lifecycle.isOnline).toBe(false);
    });
  });

  describe('Server node with aggregator', () => {
    test('create a context for server node', async () => {
      const deviceType = bridge;
      context = await edge.createServerNodeContext('Jest', deviceType.name, DeviceTypeId(deviceType.code), VendorId(0xfff1), 'Matterbridge', 0x8000, 'Matterbridge ' + deviceType.name.replace('MA-', ''));
      expect(context).toBeDefined();
    });

    if (getMacAddress() !== '30:f6:ef:69:2b:c5') return;

    test('create a server node', async () => {
      server = await edge.createServerNode(context);
      expect(server).toBeDefined();
    });

    test('create an aggregator', async () => {
      aggregator = await edge.createAggregatorNode(context);
      expect(aggregator).toBeDefined();
      expect(aggregator.id).toBe('Jest aggregator');
      expect(aggregator.type.name).toBe(AggregatorEndpointDefinition.name);
      expect(aggregator.type.deviceType).toBe(AggregatorEndpointDefinition.deviceType);
      expect(aggregator.type.deviceClass).toBe(AggregatorEndpointDefinition.deviceClass);
      expect(aggregator.type.deviceRevision).toBe(AggregatorEndpointDefinition.deviceRevision);
      await server.add(aggregator);
      // logEndpoint(EndpointServer.forEndpoint(aggregator));
    });

    test('create an onOffLight and add it', async () => {
      const deviceType = onOffLight;
      const device = new MatterbridgeEndpoint(deviceType, { uniqueStorageKey: deviceType.name.replace('MA-', '') + '-' + count });
      expect(device).toBeDefined();
      expect(device.id).toBe(deviceType.name.replace('MA-', '') + '-' + count);
      expect(device.type.name).toBe(deviceType.name.replace('-', '_'));
      expect(device.type.deviceType).toBe(deviceType.code);
      expect(device.type.deviceClass).toBe(deviceType.deviceClass.toLowerCase());
      expect(device.type.deviceRevision).toBe(deviceType.revision);
      await aggregator.add(device);
      // logEndpoint(EndpointServer.forEndpoint(device));
    });

    test('create a dimmableLight and add it', async () => {
      const deviceType = dimmableLight;
      const device = new MatterbridgeEndpoint(deviceType, { uniqueStorageKey: deviceType.name.replace('MA-', '') + '-' + count });
      expect(device).toBeDefined();
      expect(device.id).toBe(deviceType.name.replace('MA-', '') + '-' + count);
      expect(device.type.name).toBe(deviceType.name.replace('-', '_'));
      expect(device.type.deviceType).toBe(deviceType.code);
      expect(device.type.deviceClass).toBe(deviceType.deviceClass.toLowerCase());
      expect(device.type.deviceRevision).toBe(deviceType.revision);
      await aggregator.add(device);
      // logEndpoint(EndpointServer.forEndpoint(device));
    });

    test('start server node', async () => {
      await edge.startServerNode(server);
      expect(server.lifecycle.isOnline).toBe(true);
      expect(server.lifecycle.isCommissioned).toBe(false);
      // logEndpoint(EndpointServer.forEndpoint(server));
    });

    test('stop server node', async () => {
      await edge.stopServerNode(server);
      expect(server.lifecycle.isOnline).toBe(false);
      // logEndpoint(EndpointServer.forEndpoint(server));
    });
  });

  describe('Server node with devices', () => {
    test('create a context for server node', async () => {
      const deviceType = bridge;
      context = await edge.createServerNodeContext('Jest', deviceType.name, DeviceTypeId(deviceType.code), VendorId(0xfff1), 'Matterbridge', 0x8000, 'Matterbridge ' + deviceType.name.replace('MA-', ''));
      expect(context).toBeDefined();
    });

    if (getMacAddress() !== '30:f6:ef:69:2b:c5') return;

    test('create a onOffLight device', async () => {
      const deviceType = onOffLight;
      const context = await edge.createServerNodeContext('Jest', deviceType.name, DeviceTypeId(deviceType.code), VendorId(0xfff1), 'Matterbridge', 0x8000, 'Matterbridge ' + deviceType.name.replace('MA-', ''));
      const server = await edge.createServerNode(context);
      const device = new MatterbridgeEndpoint(deviceType, { uniqueStorageKey: deviceType.name.replace('MA-', '') + '-' + count });
      expect(device).toBeDefined();
      expect(device.id).toBe(deviceType.name.replace('MA-', '') + '-' + count);
      expect(device.type.name).toBe(deviceType.name.replace('-', '_'));
      expect(device.type.deviceType).toBe(deviceType.code);
      expect(device.type.deviceClass).toBe(deviceType.deviceClass.toLowerCase());
      expect(device.type.deviceRevision).toBe(deviceType.revision);
      expect(device.type.behaviors.identify).toBeDefined();
      expect(device.type.behaviors.groups).toBeDefined();
      expect(device.type.behaviors.onOff).toBeDefined();
      await server.add(device);
      await edge.startServerNode(server);
      expect(server.lifecycle.isOnline).toBe(true);
      expect(server.lifecycle.isCommissioned).toBe(false);
      await edge.stopServerNode(server);
      expect(server.lifecycle.isOnline).toBe(false);
    });

    test('create a onOffOutlet device', async () => {
      const deviceType = onOffOutlet;
      const context = await edge.createServerNodeContext('Jest', deviceType.name, DeviceTypeId(deviceType.code), VendorId(0xfff1), 'Matterbridge', 0x8000, 'Matterbridge ' + deviceType.name.replace('MA-', ''));
      const server = await edge.createServerNode(context);
      const device = new MatterbridgeEndpoint(deviceType, { uniqueStorageKey: deviceType.name.replace('MA-', '') + '-' + count });
      expect(device).toBeDefined();
      expect(device.id).toBe(deviceType.name.replace('MA-', '') + '-' + count);
      expect(device.type.name).toBe(deviceType.name.replace('-', '_'));
      expect(device.type.deviceType).toBe(deviceType.code);
      expect(device.type.deviceClass).toBe(deviceType.deviceClass.toLowerCase());
      expect(device.type.deviceRevision).toBe(deviceType.revision);
      expect(device.type.behaviors.identify).toBeDefined();
      expect(device.type.behaviors.groups).toBeDefined();
      expect(device.type.behaviors.onOff).toBeDefined();
      await server.add(device);
      await edge.startServerNode(server);
      expect(server.lifecycle.isOnline).toBe(true);
      expect(server.lifecycle.isCommissioned).toBe(false);
      await edge.stopServerNode(server);
      expect(server.lifecycle.isOnline).toBe(false);
    });

    test('create a onOffSwitch device', async () => {
      const deviceType = onOffSwitch;
      const context = await edge.createServerNodeContext('Jest', deviceType.name, DeviceTypeId(deviceType.code), VendorId(0xfff1), 'Matterbridge', 0x8000, 'Matterbridge ' + deviceType.name.replace('MA-', ''));
      const server = await edge.createServerNode(context);
      const device = new MatterbridgeEndpoint(deviceType, { uniqueStorageKey: deviceType.name.replace('MA-', '') + '-' + count });
      expect(device).toBeDefined();
      expect(device.id).toBe(deviceType.name.replace('MA-', '') + '-' + count);
      expect(device.type.name).toBe(deviceType.name.replace('-', '_'));
      expect(device.type.deviceType).toBe(deviceType.code);
      expect(device.type.deviceClass).toBe(deviceType.deviceClass.toLowerCase());
      expect(device.type.deviceRevision).toBe(deviceType.revision);
      expect(device.type.behaviors.identify).toBeDefined();
      expect(device.type.behaviors.groups).toBeDefined();
      expect(device.type.behaviors.onOff).toBeDefined();
      await server.add(device);
      await edge.startServerNode(server);
      expect(server.lifecycle.isOnline).toBe(true);
      expect(server.lifecycle.isCommissioned).toBe(false);
      await edge.stopServerNode(server);
      expect(server.lifecycle.isOnline).toBe(false);
    });

    test('create a temperature humidity pressure sensor', async () => {
      const deviceType = DeviceTypes.TEMPERATURE_SENSOR;
      const context = await edge.createServerNodeContext('Jest', deviceType.name, DeviceTypeId(deviceType.code), VendorId(0xfff1), 'Matterbridge', 0x8000, 'Matterbridge ' + deviceType.name.replace('MA-', ''));
      const server = await edge.createServerNode(context);
      const device = new MatterbridgeEndpoint(deviceType, { uniqueStorageKey: deviceType.name.replace('MA-', '') + '-' + count });
      expect(device).toBeDefined();
      expect(device.id).toBe(deviceType.name.replace('MA-', '') + '-' + count);
      expect(device.type.name).toBe(deviceType.name.replace('-', '_'));
      expect(device.type.deviceType).toBe(deviceType.code);
      expect(device.type.deviceClass).toBe(deviceType.deviceClass.toLowerCase());
      expect(device.type.deviceRevision).toBe(deviceType.revision);
      expect(device.type.behaviors.identify).toBeDefined();
      expect(device.type.behaviors.temperatureMeasurement).toBeDefined();

      device.addDeviceType(DeviceTypes.HUMIDITY_SENSOR);
      device.addClusterServerFromList(device, [RelativeHumidityMeasurement.Cluster.id]);

      device.addDeviceTypeWithClusterServer([DeviceTypes.PRESSURE_SENSOR], [PressureMeasurement.Cluster.id]);

      await server.add(device);
      await edge.startServerNode(server);
      expect(server.lifecycle.isOnline).toBe(true);
      expect(server.lifecycle.isCommissioned).toBe(false);
      logEndpoint(EndpointServer.forEndpoint(device));
      await edge.stopServerNode(server);
      expect(server.lifecycle.isOnline).toBe(false);
    });
  });
});
