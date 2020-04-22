//CURRENT CODE INSPIRED by
// https://github.com/zoranlj/LMap/tree/master/src
// https://github.com/zoranlj/MapStarter/blob/master/src/pages/home/home.page.ts

//WEB COMPONENT js implementation
//https://github.com/leaflet-extras/leaflet-map/blob/master/leaflet-core.html
// https://leaflet-extras.github.io/leaflet-map/demo.html

import { Component, Prop, Element, Watch, h, EventEmitter, Event } from '@stencil/core';
import L from 'leaflet';

import { extend } from './extensions/leaflet-draw/leaflet.draw';
import esri from '../../../node_modules/esri-leaflet/dist/esri-leaflet';

extend(L);
L.esri = esri;

@Component({
  tag: 'l-map',
  styleUrls: [
    // '../../../node_modules/leaflet/dist/leaflet.css',
    'leaflet-map-component.css',
  ],
  assetsDirs:['../../assets'],
  shadow: true
})

export class LMap {
  @Element() LMapHTMLElement: HTMLElement;
  @Prop() iconUrl: string;
  @Prop() tileLayerUrl: string;
  @Prop() center: string;
  @Prop() zoom: string;
  @Prop() minZoom: string;
  @Prop() maxZoom: string;
  @Prop() currentLocation: string;
  @Prop() currentLocationIconUrl: string;
  @Prop() locations: Array<[number, number]>;
  @Watch('locations')
  handleLocationsChanged(locations: Array<[number, number]>) {
    console.log('l-map handleLocationsChanged');
    this.addMarkers(locations);
  }
  @Event() message: EventEmitter;

  LMap;
  layerGroupTiles = L.layerGroup();
  layerGroupLocations = L.layerGroup();

  render() {
    return (
      <div id="l-map"></div>
    );
  }

  componentDidLoad() {
    console.log('l-map componentDidLoad');
    console.log('l-map tileLayerUrl', this.tileLayerUrl);
    console.log('l-map iconurl', this.iconUrl);
    console.log('l-map locations', this.locations);
    console.log('l-map center', this.center);
    console.log('l-map zoom', this.zoom);
    console.log('l-map min zoom', this.minZoom);
    console.log('l-map max zoom', this.maxZoom);

    const LMapElement: HTMLElement = this.LMapHTMLElement.shadowRoot.querySelector('#l-map');

    const tileLayer = L.tileLayer(this.tileLayerUrl);
    const esriTopographic = L.esri.basemapLayer('Topographic');
    const esriStreets = L.esri.basemapLayer('Streets');
    const esriGray = L.esri.basemapLayer('Gray');
    const esriDarkGray = L.esri.basemapLayer('DarkGray');
    const esriShadedRelief = L.esri.basemapLayer('ShadedRelief');
    const esriImagery = L.esri.basemapLayer('Imagery');
    const esriNationalGeographic = L.esri.basemapLayer('NationalGeographic').addTo(this.layerGroupTiles);

    setTimeout(() => {
      this.LMap.invalidateSize();
    },2000);

    if (this.locations && this.locations.length) {
      this.addMarkers(this.locations);
    }

    if (this.currentLocation && this.currentLocation.length) {
      this.addCurrentLocationMarker(JSON.parse(this.currentLocation));
    }

    let esriFeatureLayerStates = L.esri.featureLayer({
      url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_States_Generalized/FeatureServer/0',
      style: function () {
        return { color: '#545454', weight: 1 };
      },
      useCors: false
    });

    this.LMap = L.map(LMapElement, {
      // drawControl:true,
      tap: false,
      zoomControl: true,
      minZoom: Number(this.minZoom) || 0,
      maxZoom: Number(this.maxZoom) || 16,
      maxBounds: [[-90, -180],[90, 180]],
      layers: [this.layerGroupTiles, this.layerGroupLocations, esriFeatureLayerStates],
    })
    .setView(this.center? JSON.parse(this.center) : [0,0], this.zoom ? Number(this.zoom) : 2)
    .on('click', (e:any) => {
        console.log('l-map component send location message', e);
        this.message.emit({
          type: 'Map.CLICK',
          coordinates: {...e.latlng}
        });
      });

    //POLYGON DRAW --START
    const osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const osmAttrib = '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const osm = L.tileLayer(osmUrl, { maxZoom: 18, attribution: osmAttrib });
    const drawnItems = L.featureGroup().addTo(this.LMap);
    L.control.layers(
      {
        'osm': osm.addTo(this.LMap),
        "google": L.tileLayer('http://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}', {
            attribution: 'google'
        })
      },
     { 'drawlayer': drawnItems },
     { position: 'topleft', collapsed: false }).addTo(this.LMap);
     
     this.LMap.addControl(new L.Control.Draw({
        edit: {
            featureGroup: drawnItems,
            poly: {
                allowIntersection: false
            }
        },
        draw: {
            polygon: {
                allowIntersection: false,
                showArea: true
            }
        }
    }));

    this.LMap.on(L.Draw.Event.CREATED, (event) => {
        const layer = event.layer;
        drawnItems.addLayer(layer);
        
        console.log('Draw.Event.CREATED', layer);
        if(layer.editing?.latlngs){
          this.message.emit({
            type: 'Draw.Event.CREATED',
            shape: 'polygon',
            vertexes: [...layer.editing.latlngs[0][0]]
          });
        }
        else{
          this.message.emit({
            type: 'Draw.Event.CREATED',
            shape: 'not polygon',
          });
        }
    });

    //POLYGON DRAW --END


    const baseMaps = {
      'Custom Tile Layer': tileLayer,
      'Esri Topographic': esriTopographic,
      'Esri Streets': esriStreets,
      'Esri Gray': esriGray,
      'Esri DarkGray': esriDarkGray,
      'Esri ShadedRelief': esriShadedRelief,
      'Esri Imagery': esriImagery,
      'Esri National Geographic': esriNationalGeographic
    };

    const overlayMaps = {
      'Custom Locations': this.layerGroupLocations,
      'Esri States': esriFeatureLayerStates
    };

    L.control.layers(baseMaps, overlayMaps, {
      position: 'bottomright'
    }).addTo(this.LMap);

  }

  addMarkers(locations) {
    const customIcon = L.icon({
      iconUrl: this.iconUrl,
      // iconSize: [30, 30]
    });
    locations.map(latLng => {
      L.marker(latLng, { icon: customIcon }).addTo(this.layerGroupLocations);
    });
  }

  addCurrentLocationMarker(location) {
    const customIcon = L.icon({
      iconUrl: this.currentLocationIconUrl,
      // iconSize: [30, 30]
    });
    L.marker(location, { icon: customIcon }).addTo(this.layerGroupLocations);
  }

}