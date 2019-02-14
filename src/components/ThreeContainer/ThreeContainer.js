import React, { PureComponent } from 'react'

import * as THREE from 'three'


import { initCamera, initRenderer, initControls, initLights, initFloor, initGridHelper, initScene } from './util/init';

import './ThreeContainer.css'
import Loader from './Loader';
import SceneManager from './sceneManager';

class ThreeContainer extends PureComponent {
    constructor( props ) {
        super( props )

        this.state = {
            loading: false
        }
    }

    componentDidMount() {

        const canvasSize = {
            width: this.canvasContainer.clientWidth,
            height: this.canvasContainer.clientHeight
        }


        /** This will contain the group and everything else */
        this.scene = initScene();
            
        const lights = initLights();
        const floor = initFloor();
        const gridHelper = initGridHelper();
        

        this.camera = initCamera();
        this.renderer = initRenderer( this.canvas, canvasSize, window.devicePixelRatio );
        this.orbitControls = initControls(this.camera, this.canvas);
        this.orbitControls.addEventListener( 'change', this.renderScene )
        
        
        this.scene.add( floor, gridHelper, ...lights);
        
        const objectsContainer = this.props.sceneManager.getContainer()
        this.scene.add( objectsContainer )

        if (process.env.NODE_ENV === "development") {
            // expose variable to window in order to be able to use Three.js inspector
            window.scene = this.scene;
            window.sceneManager = this.props.sceneManager
        }

        this.renderScene()
    }

    componentDidUpdate( prevProps, prevState ) {
        const { sceneManager, loadedObjects, poseData } = this.props
        let shouldRender = false
        
        const prevObjects = prevProps.loadedObjects
        if ( prevObjects !== loadedObjects ) {
            const keysToSearch = sceneManager.sortedCategoryIds

            for ( const key of keysToSearch ) {
                if ( prevObjects[ key ] !== loadedObjects[ key ] ) {
                    
                    // found object to update
                    sceneManager.add( key, loadedObjects[ key ] )
                    shouldRender = true

                }
            }

        }

        if ( shouldRender ) {
            this.renderScene()
        }
    }

    renderScene = () => this.renderer.render( this.scene, this.camera )

    render() {
        const { loading: isLoading } = this.state

        const className = [
            'canvas-container',
            ... isLoading ? ['loading'] : []
        ].join(' ')

        return (
            <div
                className = { className }
                ref = { el => this.canvasContainer = el }
            >
                <canvas
                    ref = { el => this.canvas = el }
                />
                <Loader loading = { isLoading } />
            </div>
        );
    }
}

export default ThreeContainer