import React, { Component } from 'react';
import cn from 'classnames';

import { fromEvent } from '../../../util/helpers';

import CanvasContainer from '../../CanvasContainer';

import threeUtils from './three';

import commonStyles from '../index.module.css';
import styles from './index.module.css';

export default class PlaceAttachpoint extends Component {
    constructor(props) {
        super(props);

        this.state = {
            position: props.position,
        };

        this.mouseDownPosition = null;
    }

    componentDidMount() {
        const { uploadedObjectGeometry, position } = this.props;

        threeUtils.init(uploadedObjectGeometry, position);

        threeUtils.renderScene();
    }

    componentWillUnmount() {
        threeUtils.clearObjects();
    }

    handleMouseDown = event => {
        this.mouseDownPosition = fromEvent(event);
    };

    handleMouseUp = event => {
        const mouseUpPosition = fromEvent(event);

        const deltaX = mouseUpPosition.x - this.mouseDownPosition.x;
        const deltaY = mouseUpPosition.y - this.mouseDownPosition.y;

        const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2); // euclidean distance

        if (distance < 0.001) {
            // counts as click

            // use value when mouse is pressed (not when released)
            const intersection = threeUtils.rayCast(this.mouseDownPosition);

            if (intersection) {
                // invert to get position of pivot point
                const computedPosition = {
                    x: -intersection.x,
                    y: -intersection.y,
                    z: -intersection.z,
                };

                this.setState({
                    position: computedPosition,
                });

                threeUtils.setSpherePosition(intersection);

                threeUtils.renderScene();
            }
        }
    };

    handleNext = () => {
        const { onPositionChange, nextStep } = this.props;
        const { position } = this.state;

        onPositionChange(position);
        nextStep();
    };

    render() {
        const { currentCategory, previousStep } = this.props;

        const parentName = currentCategory
            ? currentCategory.parent
                ? currentCategory.parent.name
                : 'the scene'
            : '';

        const className = cn(commonStyles.wizardStep, styles.placeAttachpoint);

        return (
            <div className={className}>
                <CanvasContainer
                    className={styles.previewCanvas}
                    domElement={threeUtils.getCanvas()}
                    onMouseDown={this.handleMouseDown}
                    onMouseUp={this.handleMouseUp}
                />

                <div className={styles.title}>
                    <h2>Place AttachPoint</h2>
                    <p>
                        Click roughly where this part attaches to {parentName}
                    </p>
                </div>

                <div className={styles.info}>
                    <div className={styles.infoTitle}>Camera Controls</div>
                    <span> Scroll: Zoom </span>
                    <br />
                    <span> Left Click: Rotate </span>
                    <br />
                    <span> Right Click: Pan </span>
                </div>

                <div className={styles.buttonsContainer}>
                    <div
                        className={cn(commonStyles.button, styles.button)}
                        onClick={previousStep}
                    >
                        Back
                    </div>
                    <div
                        className={cn(commonStyles.button, styles.button)}
                        onClick={this.handleNext}
                    >
                        Next
                    </div>
                </div>
            </div>
        );
    }
}
