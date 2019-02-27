import React, { Component, createRef } from 'react'
import classNames from 'classnames'

import {
    Scene, PerspectiveCamera, WebGLRenderer, PointLight, Color,
    MeshStandardMaterial, Mesh
} from 'three'
import OrbitControls from 'three-orbitcontrols'
import * as utils from '../ThreeContainer/util/init'

class AdjustTransforms extends Component {
    constructor( props ) {
        super( props )

        this.canvasRef = createRef()
    }
    
    componentDidMount() {
        const canvas = this.canvasRef.current
        const { width, height } = canvas.getBoundingClientRect()


        this.scene = new Scene
        this.scene.background = new Color( 0xeeeeee );

        this.camera = new PerspectiveCamera(
            75,
            (width / height),
            0.001,
            1000
        );
        this.camera.position.set( 0, .5, -1 )
        this.camera.lookAt( 0, 3, 0 )
        

        this.renderer = utils.initRenderer( canvas, { width, height }, window.devicePixelRatio )

        const light1 = new PointLight( 0xc1c1c1, 1, 100 )
        light1.position.set( -7, -1, -7 )

        const light2 = new PointLight( 0xc1c1c1, 1, 100 )
        light2.position.set( 7, -1, -7 )

        this.scene.add( light1, light2, utils.initGridHelper() )

        this.orbitControls = new OrbitControls( this.camera, canvas )
        this.orbitControls.addEventListener( 'change', this.renderScene )

        this.renderScene()

    }

    componentDidUpdate( prevProps ) {
        const prevGeometry = prevProps.uploadedObjectGeometry
        const currGeometry = this.props.uploadedObjectGeometry

        if ( prevGeometry !== currGeometry ) {

            const mesh = new Mesh(
                currGeometry,
                new MeshStandardMaterial
            )

            this.scene.add( mesh )
            this.renderScene()

        }
    }

    renderScene = () => {
        this.renderer.render( this.scene, this.camera )
    }

    render() {
        const {
            visible,
            currentCategory,
            nextStep, previousStep
        } = this.props

        const parentName = currentCategory.parent
            ? currentCategory.parent.className
            : 'the scene'

        return (
            <div
                className = {classNames('wizard-step', 'adjust-transforms', { visible })}
            >

                <canvas
                    className = "preview-canvas"
                    ref = { this.canvasRef }
                />

                <div className = "title" >
                    <h4>Place AttachPoint</h4>
                    <p>Click where this part attaches to {parentName}</p>
                </div>

                <div className = "info" >
                    <div className = "info-title" >
                        Camera Controls
                    </div>
                    <span> Scroll: Zoom </span><br/>
                    <span> Left Click: Rotate </span><br/>
                    <span> Right Click: Pan </span>
                </div>

                <div className = "buttons-container">

                    <div
                        className = "button"
                        onClick = { previousStep }
                    >
                        Back
                    </div>
                    <div
                        className = "button"
                        onClick = { nextStep }
                    >
                        Next
                    </div>

                </div>


            </div>
        )
    }
}

export default AdjustTransforms