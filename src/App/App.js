import React, { Component, createRef, useState, useEffect, useMemo, useRef } from 'react'

import SettingsPopup from '../components/SettingsPopup'
import UploadWizard from '../components/UploadWizard'
import Header from '../components/Header';
import Selector from '../components/Selector';
import PartTypesView from '../components/PartTypes'
import LoadingIndicator from '../components/LoadingIndicator';
import ButtonsContainer from '../components/ButtonsContainer';

import {
    ACCEPTED_OBJECT_FILE_EXTENSIONS,
    OBJECT_STATUS
} from '../constants'
import { fetchObjects, get3DObject, getObjectFromGeometry } from '../util/objectHelpers';
import {
    getNameAndExtension, objectMap
} from '../util/helpers'

import useMmfApi from '../hooks/useMmfApi';
import useCustomizerState from '../hooks/useCustomizerState';
import useSceneManager from '../hooks/useSceneManager';


import styles from './App.module.scss'


/**
 * @type {import('react').FunctionComponent<import('../types').AppProps>}
 */
const App = props => {
    const {
        partTypes, partTypesArray,
        objects, addObject, setObjectStatus,

        customizerName, price, description, isPrivate, imageUrl,
        updateSettings,

        selectedPartTypeId, setSelectedPartTypeId,
        selectedPartType,
        selectedParts, setSelectedParts,
        selectedPartsIds,

        addCustomizedMeshToCart,
        isSelectionInCart, userMustBuySelection,

        getObjectsByPartTypeId,

        computeGlobalPosition,
        getParentAttachPointPosition,
        getChildPartTypeByAttachPoint,
    } = useCustomizerState(props);

    const [uploadedObjectData, setUploadedObjectData] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const api = useMmfApi(props.api);

    const { canvasContainerRef, sceneManager } = useSceneManager(partTypesArray, props.worldData.container_rotation);

    useEffect(() => {
        sceneManager.renderScene();
    }, []);

    useEffect(() => void (async () => {
        setIsLoading(true);
    
        try {
            let oneOfEach = {};
            
            // check location hash for initial selected parts
            const hash = window.location.hash.slice(1);
            if (hash !== '') {
                /** @type {number[]} */
                const selectedIds = JSON.parse(hash);
    
                for (const partId of selectedIds) {
                    const part = objects.byId[partId];
                    if (part) {
                        oneOfEach[part.partTypeId] = part;
                    }
                }
            }
    
            // select first part from each part type that hasn't been filled out from the hash
            for (const partTypeId of partTypes.allIds) {
                if (!oneOfEach[partTypeId]) {
                    oneOfEach[partTypeId] = getObjectsByPartTypeId(partTypeId)[0]; // get first if not found in hash
                }
            }
    
    
            const objectsToLoad = await fetchObjects( oneOfEach )
            const newSelectedParts = objectMap( oneOfEach, object => object.id )
    
            
            {
                sceneManager.addAll(objectsToLoad);
                sceneManager.rescaleContainerToFitObjects(4);
                sceneManager.renderScene();
            }
    
    
            setSelectedParts(newSelectedParts);
    
        } catch ( err ) {
            console.error( err )
        }
        
        setIsLoading(false);
    })(), []);

    const showUploadWizard = Boolean(uploadedObjectData);

    const selectorData = (selectedPartType ?
        {
            objects:  getObjectsByPartTypeId(selectedPartType.id),
            currentPartType: selectedPartType
        } : null
    );

    let downloadButtonMessage;
    if (userMustBuySelection) {
        if(isSelectionInCart) {
            downloadButtonMessage = 'Item already in cart';
        } else {
            downloadButtonMessage = `Add To Cart ($${price})`;
        }
    } else {
        downloadButtonMessage = `Download`;
    }

    const setSelected3dObject = (partTypeId, newObject) => {
        sceneManager.add(partTypeId, newObject);
        sceneManager.rescaleContainerToFitObjects(4);
        sceneManager.renderScene();
    };

    const setSelectedObjectId = (partTypeId, objectId) => {
        setSelectedParts(currentSelectedParts => ({
            ...currentSelectedParts,
            [partTypeId]: objectId
        }));
    };

    const handleObjectSelected = async (partTypeId, objectData) => {
        setIsLoading(true);

        try {

            const newObject = await get3DObject(objectData);
            setSelected3dObject(partTypeId, newObject);
            setSelectedObjectId(partTypeId, objectData.id);

        } catch ( err ) {
            const partType = partTypes.byId[partTypeId];
            console.error(
                `Something went wrong while loading object of type ${partType.name}:\n`
                + err
            );
        }

        setIsLoading(false);
    };

    const handleDeleteObject = async (objectId) => {
        
        const oldStatus = objects.byId[objectId].status;

        setObjectStatus(objectId, OBJECT_STATUS.LOADING);

        try {
            
            await api.deletePart(objectId);
            setObjectStatus(objectId, OBJECT_STATUS.DELETED);
            
        } catch {
            setObjectStatus(objectId, oldStatus);
            console.error(`Failed to delete object with id ${objectId}`);
        }
    }

    const handleUpload = (partTypeId, filename, objectURL) => {
        const partType = partTypes.byId[partTypeId];

        const { name, extension } = getNameAndExtension(filename);

        if (!ACCEPTED_OBJECT_FILE_EXTENSIONS.includes(extension)) {
            console.error(`Unrecognized extension '${extension}'`);
            return;
        }

        setUploadedObjectData({
            partType,
            name,
            filename,
            extension,
            objectURL,
        });
    }

    const handleDownload = async () => {
        if(isSelectionInCart) {
            window.alert('item added to cart')
            return;
        }

        try {
            const customizedMeshData = await api.generateCustomizedMesh(selectedPartsIds);

            if(!userMustBuySelection) {
                if (customizedMeshData.status === 1) { // ready for download
                    const fullCustomizedMeshData = await api.getCustomizedMesh(customizedMeshData.id)
                    window.open(fullCustomizedMeshData.file_url);
                } else {
                    // TODO add popup component
        
                    const message = `You will receive an email when the mesh has finished processing.`
                    window.alert( message )
                }
            } else {
                const data = await api.addToCart(customizedMeshData.id);
                addCustomizedMeshToCart(customizedMeshData);

                window.customEventDispatcher.dispatchEvent('REFRESH_CART_AMOUNT');
                window.customEventDispatcher.dispatchEvent('ITEM_ADDED_TO_CART', data);
            }

        } catch (err) {
            console.error(err)

            if(err.response.data.error === "access_denied") {
                window.customEventDispatcher.dispatchEvent('SHOW_LOGIN');
            }
        }
    };

    const handleSaveChanges = async fields => {
        try {
            const updatedCustomizer = await api.patchCustomizer(fields);
            updateSettings(updatedCustomizer);

        } catch (err) {
            console.error(err)
        }
    };

    const handleWizardCompleted = async (partType, { name, extension, objectURL, imageSrc, geometry, metadata }) => {
        setIsLoading(true);
        setUploadedObjectData(null);
        
        const partTypeId = partType.id
        
        const object = getObjectFromGeometry( geometry, metadata )
                
        const objectData = {
            name,
            files: {
                default: {
                    extension,
                    url: objectURL,
                }
            },
            img: imageSrc,
            extension: 'stl',
            metadata,
            partTypeId,
        }

        try {
            const id = await api.postPart(objectData)
    
            const objectToAdd = {
                ...objectData,
                id,
                status: OBJECT_STATUS.IN_SYNC
            }
    
            setSelected3dObject( partTypeId, object )
            setSelectedObjectId( partTypeId, id )
            addObject( objectToAdd )
        } catch {
            console.error(`Failed to upload object '${name}'`)
        }

        setIsLoading(false);
    }

    return (
        <div className = {styles.app}>

            <div className={styles.canvasContainer} ref={canvasContainerRef}>
            </div>

            <Header
                title = { customizerName }
                userName = {props.worldData['user_name']}
                userUrl = {props.worldData['user_url']}
            />

            <div className = {styles.editorPanelContainer}>
                <div className = {styles.editorPanel}>
                    <div className = {styles.partTypesContainer}>
                        <PartTypesView
                            partTypes = { partTypesArray }
                            selectedPartTypeId = { selectedPartTypeId }
                            onPartTypeSelected = { id => setSelectedPartTypeId(id) }
                        />
                    </div>
                    
                    <div className = {styles.selectorContainer}>
                        <Selector
                            data = { selectorData }
                            onObjectSelected = { handleObjectSelected }
                            onDelete = { handleDeleteObject }
                            onUpload = { handleUpload }
                            edit_mode = { props.edit_mode }
                        />
                    </div>
                </div>

            </div>

            <ButtonsContainer
                partTypes = { partTypesArray }
                onUpload = { handleUpload }
                onDownload = { handleDownload }
                downloadButtonMessage = {downloadButtonMessage}
                onShowSettings = {() => setShowSettings(true)}
                edit_mode = { props.edit_mode }
            />

            {showUploadWizard && (
                <UploadWizard
                    getGlobalPosition = { computeGlobalPosition }
                    getParentAttachPointPosition = {getParentAttachPointPosition}
                    getChildPartTypeByAttachPoint = {getChildPartTypeByAttachPoint}

                    data = { uploadedObjectData }
                    
                    showLoader = {() => setIsLoading(true)}
                    hideLoader = {() => setIsLoading(false)}
                    onWizardCanceled = {() => setUploadedObjectData(null)}
                    onWizardCompleted = {handleWizardCompleted}
                />
            )}

            {showSettings && (
                <SettingsPopup
                    className = {styles.settingsPopup}
                    
                    name = {customizerName}
                    price = {price}
                    description = {description}
                    isPrivate = {isPrivate}
                    imageUrl = {imageUrl}

                    onSave = {handleSaveChanges}
                    onCancel = {() => setShowSettings(false)}

                    customizer_pay_per_download_enabled = {props.customizer_pay_per_download_enabled}
                />
            )}

            <LoadingIndicator visible = {isLoading} />
        </div>
    );
}

export default App