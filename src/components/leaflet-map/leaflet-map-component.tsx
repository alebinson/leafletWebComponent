//CURRENT CODE INSPIRED by
// https://github.com/zoranlj/LMap/tree/master/src
// https://github.com/zoranlj/MapStarter/blob/master/src/pages/home/home.page.ts

//WEB COMPONENT js implementation
//https://github.com/leaflet-extras/leaflet-map/blob/master/leaflet-core.html
// https://leaflet-extras.github.io/leaflet-map/demo.html

import { Component, Prop, Element, Watch, h, EventEmitter, Event } from '@stencil/core';
import L from 'leaflet';
import ResizeObserver from "resize-observer-polyfill";

import { extend } from './extensions/leaflet-draw/leaflet.draw';
import { extendHeatLayer } from './extensions/leaflet-heatmap-layer/leaflet-heatmap-layer';
import esri from '../../../node_modules/esri-leaflet/dist/esri-leaflet';

extend(L);
extendHeatLayer(L);
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
  @Prop({ mutable: true }) center: string;
  @Prop({ mutable: true }) zoom: string;
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

  private ro: ResizeObserver;

  private getBoundingBox = (bounds) => {
    return {
      northWest: {...bounds.getNorthWest()},
      southEast: {...bounds.getSouthEast()}
    };
  }

  private observeMapResizing = (mapElement) => {
    let rtime;
    let timeout = false;
    const delta = 200;
    const resizeend = () => {
      const now = (new Date()).getTime();
      if ( now - rtime < delta) {
          setTimeout(resizeend, delta);
      } else {
          timeout = false;
          
          console.log('RESIZE callback invoked');
          setTimeout(() => {
            this.LMap.invalidateSize();
          },200);

      }               
    }

    this.ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        rtime = (new Date()).getTime();
        if (timeout === false) {
            timeout = true;
            setTimeout(resizeend, delta);
        }
      }
    });
    this.ro.observe(mapElement);
  }

  private unObserveMapResizing = () => {
    this.ro.disconnect();
  }

  private addMarkers(locations) {
    const customIcon = L.icon({
      iconUrl: this.iconUrl,
      // iconSize: [30, 30]
    });
    locations.map(latLng => {
      L.marker(latLng, { icon: customIcon }).addTo(this.layerGroupLocations);
    });
  }

  private addCurrentLocationMarker(location) {
    const customIcon = L.icon({
      iconUrl: this.currentLocationIconUrl,
      // iconSize: [30, 30]
    });
    L.marker(location, { icon: customIcon }).addTo(this.layerGroupLocations);
  }

  render() {
    return (
      <div id="l-map"></div>
    );
  }

  componentDidUnload() {
    this.unObserveMapResizing();
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

    this.observeMapResizing(LMapElement);
    
    if (this.locations && this.locations.length) {
      this.addMarkers(this.locations);
    }

    if (this.currentLocation && this.currentLocation.length) {
      this.addCurrentLocationMarker(JSON.parse(this.currentLocation));
    }

    // FOR full list of supported layers see here https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services
    let esriFeatureLayerStates = L.esri.featureLayer({
      url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_States_Generalized/FeatureServer/0',
      style: function () {
        return { color: '#545454', weight: 1 };
      },
      useCors: false
    });


    const handleMapIteraction= (eventType)=>{
      // this.LMapHTMLElement.className += ' a'; //FOR observation in plain JS 
      this.center = this.LMap.getCenter();
      this.zoom = this.LMap.getZoom();
      this.message.emit({
        type: eventType,
        data: {
          center: {...(this.center as any)},
          bounds: this.getBoundingBox(this.LMap.getBounds()),
          zoom: this.zoom,
        }
      });
    }

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
          data: {
            coordinates: {...e.latlng}
          }
        });
      })
    .on('moveend',(e:any) => {
      console.log('l-map component center change', e);
      handleMapIteraction('Map.PANNED');
    })
    .on('zoom',(e:any) => {
      console.log('l-map component zoom change', e);
      handleMapIteraction('Map.ZOOMED');
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

    //HEAT MAP --START
    const heatPoints = [
      [51.505, -0.04],
      [51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],
      [51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],
      [51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],
      [51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],
      [51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],
      [51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],
      [51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],
      [51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],
      [51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],
      [51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],
      [51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],
      [51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],[51.505, -0.04],
      [51.509, -0.04],
      [51.516, -0.04],
      [51.525, -0.04],
      [51.531, -0.04],
      [51.541, -0.04],
      [51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],
      [51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],
      [51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],
      [51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],
      [51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],
      [51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],
      [51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],
      [51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],
      [51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],
      [51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],
      [51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],
      [51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],[51.541, -0.04],
      [51.551, -0.04],
      [51.561, -0.04],
      [51.571, -0.04],
      [51.581, -0.04],
      [51.615, -0.04],

      [-37.8839, 175.3745188667],
      [-37.8869090667, 175.3657417333],
      [-37.8894207167, 175.4015351167],
      [-37.8927369333, 175.4087452333],
      [-37.90585105, 175.4453463833],
      [-37.9064188833, 175.4441556833],
      [-37.90584715, 175.4463564333],
      [-37.9033391333, 175.4244005667],
      [-37.9061991333, 175.4492620333],
      [-37.9058955167, 175.4445613167],
      [-37.88888045, 175.39146475],
      [-37.8950811333, 175.41079175],
      [-37.88909235, 175.3922956333],
      [-37.8889259667, 175.3938591667],
      [-37.8876576333, 175.3859563833],
      [-37.89027155, 175.3973178833],
      [-37.8864473667, 175.3806136833],
      [-37.9000262833, 175.4183242167],
      [-37.90036495, 175.4189457],
      [-37.9000976833, 175.4197312167],
      [-37.90239975, 175.42371165],
      [-37.9043379667, 175.42430325],
      [-37.9026441, 175.4231055167],
      [-37.8883536333, 175.3888573833],
      [-37.9029948833, 175.4237386167],
      [-37.89824135, 175.4150421667],
      [-37.8976067833, 175.41510265],
      [-37.9023491333, 175.4225495],
      [-37.8856157167, 175.3775632833],
      [-37.8963032667, 175.4132068],
      [-37.8922813667, 175.4073402333898]
    ];
    L.heatLayer(heatPoints).addTo(this.LMap);
    //HEAT MAP --END


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

  

}