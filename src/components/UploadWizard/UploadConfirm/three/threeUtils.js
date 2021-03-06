import OrbitControls from '../../../../vendor/three/controls/orbit-controls';
import { Group, MeshStandardMaterial, Mesh } from 'three';

import renderer from './renderer';
import canvas from './canvas';
import scene from './scene';
import camera from './camera';

import { moveCameraToFitObject } from '../../../../util/three-helpers';

const objectContainer = new Group();

scene.add(objectContainer);

const renderScene = () => {
    renderer.render(scene, camera);
};

const orbitControls = new OrbitControls(camera, canvas);
orbitControls.addEventListener('change', renderScene);
orbitControls.enableKeys = false;

const threeUtils = {
    saveImage() {
        return new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), 'image/jpeg');
        });
    },

    renderScene,

    getCanvas() {
        return canvas;
    },

    init(geometry) {
        const mesh = new Mesh(
            geometry,
            new MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.5,
                roughness: 0.5,
            }),
        );

        objectContainer.add(mesh);

        orbitControls.reset();
        moveCameraToFitObject(camera, orbitControls, geometry.boundingBox);

        // reset renderer size
        const { width, height } = canvas.getBoundingClientRect();

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height, false);
        renderer.setPixelRatio(width / height);
    },

    clearObjects() {
        objectContainer.remove(...objectContainer.children);
    },
};

export default threeUtils;
