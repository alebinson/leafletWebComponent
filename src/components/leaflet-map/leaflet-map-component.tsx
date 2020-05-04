//CURRENT CODE INSPIRED by
// https://github.com/zoranlj/LMap/tree/master/src
// https://github.com/zoranlj/MapStarter/blob/master/src/pages/home/home.page.ts

//WEB COMPONENT js implementation
//https://github.com/leaflet-extras/leaflet-map/blob/master/leaflet-core.html
// https://leaflet-extras.github.io/leaflet-map/demo.html

import { Component, Prop, Element, Watch, h, EventEmitter, Event } from '@stencil/core';
import L from 'leaflet';
import ResizeObserver from "resize-observer-polyfill";

import { extendDrawLayer } from './extensions/leaflet-draw/leaflet.draw';
import { extendHeatLayer } from './extensions/leaflet-heatmap-layer/leaflet-heatmap-layer';
import esri from '../../../node_modules/esri-leaflet/dist/esri-leaflet';


enum RafaelGeoPoint {
  Circle = "circle",
  Marker = "marker"
}

extendDrawLayer(L);
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

  @Prop() showDrawControl: boolean = true;
  @Prop({ mutable: true }) drawers = {};

  @Prop() heatMapData: Array<[number, number]> = null;
  @Prop() geoJsonData: Array<any> = null; //Array<GeoJSON.FeatureCollection> = null;
  

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

  private initDrawers(){
    // Define you draw handler somewhere where you click handler can access it. N.B. pass any draw options into the handler
    this.drawers = {
      polygonDrawer: new L.Draw.Polygon(this.LMap),
      polylineDrawer: new L.Draw.Polyline(this.LMap),
      rectangleDrawer: new L.Draw.Rectangle(this.LMap),
      circleDrawer: new L.Draw.Circle(this.LMap)
    }

    // Assumming you have a Leaflet map accessible
    this.LMap.on('draw:created', (e) => {
      let type = e.layerType,
          layer = e.layer;

      // Do whatever you want with the layer.
      // e.type will be the type of layer that has been draw (polyline, marker, polygon, rectangle, circle)
      // E.g. add it to the map
      layer.addTo(this.LMap);
    });
  }

  private initDrawLayer(){

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
     
     if(this.showDrawControl){
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
     }

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


    //HEAT MAP --START
    let heatMapLayer = null;
    if(this.heatMapData){
      heatMapLayer = L.heatLayer(this.heatMapData);
    }
    //HEAT MAP --END

    //GEOJSON --START
    let geoJsonLayer = null;
    if(this.geoJsonData){
      const onEachFeature = (feature, layer) => {
        var popupContent = "<p>I started out as a GeoJSON " +
            feature.geometry.type + ", but now I'm a Leaflet vector!</p>";
    
        if (feature.properties?.popupContent) {
          popupContent += feature.properties.popupContent;
        }
    
        //In order to bind popup should have a map instance. If requred should be done after init map 
        // layer.bindPopup(popupContent).addTo(this.LMap);
      }
  
      geoJsonLayer = L.geoJSON(this.geoJsonData, {
        style: (feature) => feature.properties?.style,
        filter: (feature, layer) => {
          if (feature.properties) {
            // If the property "underConstruction" exists and is true, return false (don't render features under construction)
            return feature.properties.underConstruction !== undefined ? !feature.properties.underConstruction : true;
          }
          return false;
        },
        onEachFeature: onEachFeature,
        pointToLayer: (feature, latlng) => {
          const pointPresentationType: RafaelGeoPoint = feature.properties?.presentedInLayer?.type;
          let pointPresentation;
          switch(pointPresentationType){
            case RafaelGeoPoint.Circle:
              pointPresentation = L.circleMarker(latlng, feature.properties?.presentedInLayer?.style);
              break;
            case RafaelGeoPoint.Marker:
              pointPresentation = L.marker(latlng, { 
                icon: L.icon({
                  iconUrl: feature.properties?.presentedInLayer?.iconUrl,
                  // iconSize: [30, 30]
                }) 
              });
              break;
            default:
              pointPresentation = L.marker(latlng, { 
                icon: L.icon({
                  iconUrl: this.iconUrl,
                  // iconSize: [30, 30]
                }) 
              });
          }
           return pointPresentation; 
        }
      });
   
    }
    //GEOJSON --END


    this.LMap = L.map(LMapElement, {
      // drawControl:true,
      tap: false,
      zoomControl: true,
      minZoom: Number(this.minZoom) || 0,
      maxZoom: Number(this.maxZoom) || 16,
      maxBounds: [[-90, -180],[90, 180]],
      layers: [this.layerGroupTiles, this.layerGroupLocations, esriFeatureLayerStates, heatMapLayer, geoJsonLayer],
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
    this.initDrawLayer();
    this.initDrawers();
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

    if(geoJsonLayer){
      overlayMaps['GeoJson'] = geoJsonLayer;
    }
    if(heatMapLayer){
      overlayMaps['Heat Map'] = heatMapLayer;
    }

    L.control.layers(baseMaps, overlayMaps, {
      position: 'bottomright'
    }).addTo(this.LMap);

  }

  

}