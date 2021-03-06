import DeviceStore from '../stores/DeviceStore';
import Dialog from 'material-ui/Dialog';
import * as DropActions from '../actions/DropActions';
import FlatButton from 'material-ui/FlatButton';
import { List, ListItem } from 'material-ui/List';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import React from 'react';
import TextField from 'material-ui/TextField';
import Snackbar from 'material-ui/Snackbar';
import Menu from 'material-ui/Menu';
import MenuItem from 'material-ui/MenuItem';
import Divider from 'material-ui/Divider';
import Paper from 'material-ui/Paper';
import Subheader from 'material-ui/Subheader';
import { Toolbar, ToolbarGroup, ToolbarSeparator } from 'material-ui/Toolbar';
import RaisedButton from 'material-ui/RaisedButton';
import * as backend from '../backend/backend';
import { setTimeout } from 'timers';

const config = require('../../../../../../../../../../config.json');

const TRUE = 'true';
const FALSE = 'false';
const IS_SYNC = 'isSync';
const TEMP_MODEL = '__tmp_mdl_db__';
const LOAD_LAST_MODEL = 'loadLastModel';
const LOAD_TEMP_MODEL = 'loadTempModel';
const IS_TEMPORARY_MODEL = 'isTemporaryModel';
const DIGITAL_TWIN_WAS_EMPTY = 'digitalTwinWasEmpty';
const refSavedModels = firebase.database().ref('savedModels/');
const refInfoSaved = firebase.database().ref('infoSavedModels');
const refTmp = firebase.database().ref('tmp/');
const refMapTypeComponents = firebase.database().ref('mapTypeComponents');
const refDevicesWithSubsystems = firebase.database().ref('devicesWithSubsystems/');
const DELETED_MODEL = '__del_model__'; /* Flag put in the infoSavedModels.lastLoadedModels in order 
                                        * to not try to loaded a non-existant model from the database */
const UNDEFINED = 'undefined';
const RESTAPIADDRESS = backend.concatenate('http://', config.restAPI.ip, ':', config.restAPI.port, '/MBP');
// Models which have been added by the user who is logged in the platform
const savedModelsLoggedUser = {};
const style = {
    display: 'inline-block',
    float: 'left',
};
const subHeaderStyle = {
    fontSize: '20px',
    color: 'black'
};
let savedModels = {};

/* Get the saved models and put them in a element for consultation of existent keys */
refSavedModels.once('value', (snapSM) => {
    let i;
    savedModels = snapSM.val();
    for (i in snapSM.val()) {
        if (snapSM.val()[i].user === localStorage.getItem('loggedUser')) {
            savedModelsLoggedUser[i] = snapSM.val()[i].content;
        }   
    }
});

// When the user opens the digital environment, it shall be always empty
localStorage.setItem(DIGITAL_TWIN_WAS_EMPTY, TRUE);
localStorage.setItem(IS_SYNC, FALSE);

/* Just load the current model if the user has saved it right before */
if (localStorage.getItem(LOAD_LAST_MODEL) === TRUE) {
    localStorage.setItem(LOAD_LAST_MODEL, FALSE);
    refInfoSaved.once('value', (snapshot) => {           
        loadModel(snapshot.val().lastSavedModel);
    });  
} else if (localStorage.getItem(LOAD_TEMP_MODEL) === TRUE) {
    localStorage.setItem(LOAD_TEMP_MODEL, FALSE);      
    loadModel(TEMP_MODEL);
}


/* Times' levels for hierarchical execution (ms) */
const LEVEL = {
    ONE: 1000,
    TWO: 1500,
    THERE: 3000,
    FOUR: 4000,
    FIVE: 5000
};

/* Help menu */
function readSingleFile(e) {
    const file = e.target.files[0];
    const fileEnding = e.target.value.match(new RegExp('\\..*'))[0];

    if (!file) {
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        const contents = e.target.result;

        switch (fileEnding) {
            case '.rdf':
                backend.fireAjaxImport('rdfxml', contents);
                break;
            case '.ttl':
                backend.fireAjaxImport('turtle', contents);
                break;
            default:
                DropActions.importModel(JSON.parse(contents));
        }
    };
    reader.readAsText(file);
}

function loadModel(key) {
    if (key === TEMP_MODEL) {
        refTmp.once('value', (refTmp) => { 
            localStorage.setItem(DIGITAL_TWIN_WAS_EMPTY, TRUE);
            const auxInfoSaved = {};
            refSavedModels.on('value', (snapshot) => {
                DeviceStore.setModel(JSON.parse(refTmp.val()[key]));
                localStorage.setItem(IS_TEMPORARY_MODEL, FALSE);
                auxInfoSaved.lastLoadedModel = UNDEFINED;
                refInfoSaved.update(auxInfoSaved);
            });
        });
    } else {
        // The model is considered as empty always when a new one is loaded into the digital twin
        localStorage.setItem(DIGITAL_TWIN_WAS_EMPTY, TRUE);
        const auxInfoSaved = {};
        refSavedModels.on('value', (snapshot) => {
            DeviceStore.setModel(JSON.parse(snapshot.val()[key].content));
            localStorage.setItem(IS_TEMPORARY_MODEL, FALSE);
            /* Save the info of the last loaded model */
            auxInfoSaved.lastLoadedModel = key;
            refInfoSaved.update(auxInfoSaved);
        });
    }
}

function importModel() {
    document.getElementById('import-model').click();
}

function exportModel(exportType) {
    let response = '';
    switch (exportType) {
        case '.ttl':
            response = backend.fireAjaxExport('turtle', DeviceStore.getModel());
            break;
        case '.rdf':
            response = backend.fireAjaxExport('rdfxml', DeviceStore.getModel());
            break;
        default:
            response = JSON.stringify(DeviceStore.getModel());
    }
    const tempDate = new Date();
    const file = new Blob([response]);
    const exportLink = document.getElementById('export-model');
    exportLink.href = URL.createObjectURL(file);
    exportLink.download = `iot_model_${tempDate.getTime()}${exportType}`;
    exportLink.click();
}

export default class NavigationBar extends React.Component {
    constructor(props) {
        super(props);
        this.exportModel = this.exportModel.bind(this);
        this.state = {
            openSaveModelAs: false,
            openLoadModel: false,
            openExport: false,
            openHelp: false,
            modelName: '',
            modeType: '',
            savedModels: [],
            savedModelsLoggedUser: [],
            saveButtonDisabled: true,
            errorText: null,
            snackBarSaveOpen: false
        };
    }

    /* Open UI when the user clicks on the Load button */
    getSavedModels = () => {
        const auxKeysSavedModels = [];
        const auxKeysSavedModelsLoggedUser = [];
        const ref = firebase.database().ref('savedModels/');
        ref.on('value', (snapshot) => { // The whole object savedModels with all the saved models
            let saved;
            for (saved in snapshot.val()) {
                if (snapshot.val()[saved].user === localStorage.getItem('loggedUser')) {
                    auxKeysSavedModelsLoggedUser.push(saved);
                }
                auxKeysSavedModels.push(saved);
            }
            this.setState({ savedModels: auxKeysSavedModels }); // All the models
            // All the models which have been added by the logged user
            this.setState({ savedModelsLoggedUser: auxKeysSavedModelsLoggedUser });
        });
    };

    handleCloseSaveModelAs = () => {
        this.setState({
            openSaveModelAs: false,
            saveButtonDisabled: true,
            errorText: null,
            modelName: ''
        });
    };

    handleOpenLoadModel = () => {
        this.getSavedModels();
        this.setState({ openLoadModel: true }); // Make the pop-up with the saved models show up
    };

    handleCloseLoadModel = () => {
        this.setState({ openLoadModel: false });
    };

    handleOpenExport = () => {
        if (backend.isDigitalTwinEmpty()) {
            swal({
                title: 'The model in the digital environment is empty',
                text: 'Therefore, the model can not be exported',
                timer: LEVEL.THERE,
                button: false,
                icon: 'error'
            });
            setTimeout(() => {
                backend.syncCurrentModel(false);
            }, LEVEL.THERE);
        }
        else {
            this.setState({ openExport: true }); // Open the box with the options
        }
    };

    handleCloseExport = () => {
        this.setState({ openExport: false });
    };

    bind = () => {
        refInfoSaved.once('value', (snapshot) => {
            if (localStorage.getItem(IS_TEMPORARY_MODEL) === TRUE || snapshot.val().lastLoadedModel === UNDEFINED) {
                swal({
                    title: 'The temporary model must be saved before being bound',
                    text: 'Or another model can be loaded for binding',
                    icon: 'warning',
                    button: false,
                    time: LEVEL.THERE
                });
                setTimeout(() => {
                    backend.syncCurrentModel(false);
                }, LEVEL.THERE);
            } else {
                localStorage.setItem(IS_TEMPORARY_MODEL, FALSE);
                if (backend.isDigitalTwinEmpty()) {
                    swal({
                        title: 'The model in the digital environment is empty',
                        text: 'Therefore, the model can not be bound',
                        timer: LEVEL.THERE,
                        button: false,
                        icon: 'error'
                    });
                    setTimeout(() => {
                        backend.syncCurrentModel(false);
                    }, LEVEL.THERE);
                }
                else {
                    const refSavedModels = firebase.database().ref('savedModels/');
                    const refDevsWithSubsystems = firebase.database().ref('devicesWithSubsystems');
                    const auxSavedModels = {};
                    let devicesWithSubsystems;
                    let mapTypeComp;
                    /* Get devices with subsystems */
                    refInfoSaved.on('value', (snapshot) => {           
                        refDevsWithSubsystems.on('value', (devs) => {
                            devicesWithSubsystems = devs.val()[snapshot.val().lastLoadedModel];
                        });
                    });

                    refMapTypeComponents.once('value', (map) => {
                        mapTypeComp = map.val();
                    });
                    
                    /* Bind devices/components from the database */
                    setTimeout(() => {
                        refInfoSaved.once('value', (snapshot) => {
                            auxSavedModels[snapshot.val().lastLoadedModel] = JSON.stringify(DeviceStore.getModel());
                            refSavedModels.update(auxSavedModels);
                            backend.fireAjaxSave(snapshot.val().lastLoadedModel, DeviceStore.getModel(), true, false, false);
                            let i; // Devices' iteractions
                            // Listener on devices with sensors/actuators (whole element)
                            refDevsWithSubsystems.once('value', (snapdev) => {
                                // Access devices from the current loaded model
                                for (i in snapdev.val()[snapshot.val().lastLoadedModel]) {
                                    // First element' key : Object.keys(devicesWithSubsystems[i])[0]
                                    // First component' key : Object.keysdevicesWithSubsystems[i][Object.keys(devicesWithSubsystems[i])[0]])[0]
                                    backend.bindDevice(
                                        i,
                                        devicesWithSubsystems[i][Object.keys(devicesWithSubsystems[i])[0]][Object.keys(devicesWithSubsystems[i][Object.keys(devicesWithSubsystems[i])[0]])[0]].macAddress,
                                        devicesWithSubsystems[i][Object.keys(devicesWithSubsystems[i])[0]][Object.keys(devicesWithSubsystems[i][Object.keys(devicesWithSubsystems[i])[0]])[0]].ipAddress,
                                        backend.formatMacAddress(devicesWithSubsystems[i][Object.keys(devicesWithSubsystems[i])[0]][Object.keys(devicesWithSubsystems[i][Object.keys(devicesWithSubsystems[i])[0]])[0]].macAddress),
                                        RESTAPIADDRESS,
                                        devicesWithSubsystems[i],
                                        mapTypeComp,
                                        backend.bindDevice
                                    );
                                }
                            });
                        });
                    }, LEVEL.TWO); // After getting the mapping and the subsystems
                    swal({
                        title: 'The model has been saved and bound successfully',
                        button: false,
                        icon: 'success'
                    });
                    setTimeout(() => {
                        backend.syncCurrentModel();
                    }, LEVEL.THERE);
                }
            }
        });
    };

    handleOpenHelp = () => {
        this.setState({ openHelp: true });
    };

    handleCloseHelp = () => {
        this.setState({ openHelp: false });
    }

    handleCloseSnackBar = () => {
        this.setState({ snackBarSaveOpen: false });
    };

    handleSaveModelAs = () => {
        let response = false;
        if (this.state.modelName in savedModels && this.state.modelName !== TEMP_MODEL) {
            swal({
                title: 'There is already a model with the same name saved',
                text: 'It might have been saved by another user',
                icon: 'warning',
                button: false,
                timer: LEVEL.THERE
            });
            // Used in order to load the non-saved model after the synchronization
            localStorage.setItem(LOAD_TEMP_MODEL, TRUE);
            // Save the temporary model for loading with alertSave = true
            backend.fireAjaxSave(TEMP_MODEL, DeviceStore.getModel(), false, true, true);        
        } else {
            if (this.state.modelName !== '') {
                response = backend.fireAjaxSave(this.state.modelName, DeviceStore.getModel(), false, false, false);   
                setTimeout(() => {
                    backend.syncCurrentModel();
                }, LEVEL.THERE);
            }
            if (response === true) {
                this.setState({ snackBarSaveOpen: true });
            } else {
                this.setState({ snackBarSaveOpen: false });
            }
        }
    };

    /* Method for handling the export action:
     * The Frontend receives the model from the backend, 
     * then write it into a file and the user can download it */
    exportModel = () => {
        const tempDate = new Date();
        const file = new Blob(DeviceStore.getExport());
        const exportLink = document.getElementById('export-model');
        exportLink.href = URL.createObjectURL(file);
        exportLink.download = `iot_model_${tempDate.getTime()}${this.state.exportType}`;
        exportLink.click();
    };

    handleOpenSaveModel = () => {
        const auxInfoSaved = {};
        refInfoSaved.once('value', (snapshot) => {
            if ((localStorage.getItem(IS_TEMPORARY_MODEL) === TRUE || snapshot.val().lastLoadedModel === UNDEFINED) && !backend.isDigitalTwinEmpty()) {
                this.setState({ openSaveModelAs: true });
            } else {
                localStorage.setItem(IS_TEMPORARY_MODEL, FALSE);
                let auxSavedModels = {};
                if (localStorage.getItem(DIGITAL_TWIN_WAS_EMPTY) === FALSE && backend.isDigitalTwinEmpty() && snapshot.val().lastLoadedModel !== DELETED_MODEL && snapshot.val().lastLoadedModel !== DELETED_MODEL) { // The user has loaded a model in the current section
                    swal({
                        title: backend.concatenate('Do you want to delete the model ', snapshot.val().lastLoadedModel, ' ?'),
                        text: 'Once deleted, the model will not be available for modifications anymore!',
                        icon: 'warning',
                        buttons: ['No', 'Yes'],
                        dangerMode: true
                    }).then((value) => {
                        if (value) { // [Yes]
                            auxInfoSaved.lastLoadedModel = DELETED_MODEL;
                            auxInfoSaved.lastSavedModel = DELETED_MODEL;
                            refInfoSaved.update(auxInfoSaved);
                            refSavedModels.child(snapshot.val().lastLoadedModel).remove();
                            refDevicesWithSubsystems.child(snapshot.val().lastLoadedModel).remove();
                            swal({
                                title: backend.concatenate('The model ', snapshot.val().lastLoadedModel, ' has been deleted successfully'),
                                timer: LEVEL.THERE,
                                button: false,
                                icon: 'success'
                            });
                            setTimeout(() => {
                                backend.syncCurrentModel(false); // With false as parameter, nothing is loaded into the digital twin after the synchronization
                            }, LEVEL.THERE);
                        } else { // [No]
                            swal({
                                title: backend.concatenate('Do you want to load the model ', snapshot.val().lastLoadedModel, ' in its last saved version?'),
                                icon: 'warning',
                                buttons: ['No', 'Yes']
                            }).then((value) => {
                                if (value) { // Load model into the digital twin
                                    backend.syncCurrentModel(); // Sync and load the last saved model
                                } else { // Just sync the whole system
                                    backend.syncCurrentModel(false);
                                }
                            });
                        }
                    });
                } else {
                    if (backend.isDigitalTwinEmpty()) {
                        swal({
                            title: 'The model in the digital environment is empty',
                            text: 'Therefore, the model can not be saved',
                            timer: LEVEL.THERE,
                            button: false,
                            icon: 'error'
                        });
                        setTimeout(() => {
                            backend.syncCurrentModel(false);
                        }, LEVEL.THERE);
                    } else {
                        if (snapshot.val().lastLoadedModel !== TEMP_MODEL && snapshot.val().lastLoadedModel !== DELETED_MODEL && snapshot.val().lastLoadedModel !== DELETED_MODEL) { // The temp model is not supposed to be overwritten this way
                            swal({
                                title: 'Are you sure you want save the new model over the current one?',
                                text: backend.concatenate('The model ', snapshot.val().lastLoadedModel, ' will be overwritten if you confirm this action.'),
                                icon: 'warning',
                                buttons: ['No', 'Yes']
                            }).then((value) => {
                                if (value) {
                                    auxSavedModels[snapshot.val().lastLoadedModel] = JSON.stringify(DeviceStore.getModel()); /* key:last_loaded_model,
                                                                                                                              * value: current model on the digital twin */
                                    refSavedModels.update(auxSavedModels); // Update the current model on the database
                                    backend.fireAjaxSave(snapshot.val().lastLoadedModel, DeviceStore.getModel(), false, false, false); /* The DevicesWithSubsystems.lastLoadedModel is overwritten
                                                                                                                                        *  with the current information on the digital twin */
                                    swal({
                                        title: 'The current model has been saved successfully',
                                        timer: LEVEL.THERE,
                                        button: false,
                                        icon: 'success'
                                    });
                                    setTimeout(() => {
                                        backend.syncCurrentModel();
                                    }, LEVEL.THERE);
                                } else {
                                    swal({
                                        title: backend.concatenate('The model ', snapshot.val().lastLoadedModel, ' remains the same in the digital twin!'),
                                        timer: LEVEL.THERE,
                                        button: false,
                                        icon: 'success'
                                    });
                                }
                            });
                        } else {
                            this.setState({ openSaveModelAs: true }); // Open the box for saving the temporary model as a new model
                        }
                    }
                }
            }
        });
    };

    handleOpenSaveModelAs = () => { //It should be placed after getSavedModels
        localStorage.setItem(IS_TEMPORARY_MODEL, FALSE);
        if (backend.isDigitalTwinEmpty()) {
            swal({
                title: 'The model in the digital environment is empty',
                text: 'Therefore, the model can not be saved',
                timer: LEVEL.THERE,
                button: false,
                icon: 'error'
            });
            setTimeout(() => {
                backend.syncCurrentModel(false);
            }, LEVEL.THERE);
        } else { // The input box is just opened if the digital twin is not empty
            this.setState({ openSaveModelAs: true });
        }
    };

    /* Method for checking whether the input field on 'Save' is empty.
     * Also, it might disable the save button */
    isSaveButtonDisabled = () => {
        if (this.state.modelName === '') {
            this.setState({ saveButtonDisabled: true });
            this.setState({ errorText: "Model's name can not be empty!" });
        } else {
            this.setState({ saveButtonDisabled: false });
            this.setState({ errorText: null });
        }
    };

    render() {
        const actionsSaveModelAs = [
            <FlatButton label="Cancel" onTouchTap={this.handleCloseSaveModelAs} />,
            <FlatButton
                label="Save As" primary disabled={this.state.saveButtonDisabled}
                onTouchTap={() => { this.handleSaveModelAs(); this.handleCloseSaveModelAs(); }}
            />
        ];

        const actionsLoadModel = [
            <FlatButton label="Cancel" primary onTouchTap={this.handleCloseLoadModel} />
        ];

        const actionsExport = [
            <FlatButton label="Cancel" onTouchTap={this.handleCloseExport} />
        ];

        const actionsHelp = [
            <FlatButton label="Close" onTouchTap={this.handleCloseHelp} />
        ];

        if (this.state.openSaveModelAs) {
            document.body.addEventListener('keyup', this.handleKeysSaveModelAs);
        } else {
            document.body.removeEventListener('keyup', this.handleKeysSaveModelAs);
        }

        return (
            <MuiThemeProvider>
                <div>
                    <Toolbar>
                        <ToolbarGroup firstChild>
                            <RaisedButton label="Save" onClick={this.handleOpenSaveModel} primary />
                            <RaisedButton label="Save As" onClick={this.handleOpenSaveModelAs} primary />
                            <RaisedButton label="Load" onClick={this.handleOpenLoadModel} primary />
                            <RaisedButton label="Export" onClick={this.handleOpenExport} primary />
                            <RaisedButton label="Import" onClick={importModel} primary />
                            <RaisedButton label="Bind" onClick={this.bind} primary />
                            <RaisedButton label="Clear" onClick={DropActions.clearDevices} secondary />
                        </ToolbarGroup>

                        <ToolbarGroup>
                            <ToolbarSeparator />
                            <RaisedButton label="Help" onClick={this.handleOpenHelp} primary />
                        </ToolbarGroup>
                    </Toolbar>


                    <Dialog // Dialog for saving action
                        id="dialog-save-model"
                        title="Save As"
                        actions={actionsSaveModelAs}
                        modal={false}
                        open={this.state.openSaveModelAs}
                        onRequestClose={this.handleCloseSaveModelAs}
                    >
                        <TextField // Text field for entering model's name onto the save action
                            value={this.state.modelName}
                            onChange={(e) => {
                                this.setState({ modelName: e.target.value });
                            }}
                            hintText="Model's Name"
                            floatingLabelText="Enter Model's Name"
                            onBlur={this.isSaveButtonDisabled} // Check for emptiness of input
                            errorText={this.state.errorText}
                        />
                    </Dialog>

                    <Snackbar // Dialog for confation of a successful save
                        open={this.state.snackBarSaveOpen}
                        message="The model has been saved"
                        autoHideDuration={1500}
                        onRequestClose={this.handleCloseSnackBar}
                    />

                    <Dialog // Dialog for loading an action
                        title="Load"
                        actions={actionsLoadModel}
                        modal={false}
                        open={this.state.openLoadModel}
                        autoScrollBodyContent // Enable scrollable here
                        onRequestClose={this.handleCloseLoadModel}
                    >
                        <List>
                            {this.state.savedModelsLoggedUser.map(model => (
                                <ListItem
                                    onClick={() => { loadModel(model); this.handleCloseLoadModel(); }}
                                    key={this.state.savedModelsLoggedUser.indexOf(model)}
                                    primaryText={model}
                                />
                            ))}
                        </List>
                    </Dialog>

                    <Dialog // Dialog for exporting action
                        title="Export"
                        actions={actionsExport} // THE OPTIONS?
                        modal={false}
                        open={this.state.openExport}
                        onRequestClose={this.handleCloseExport}
                    >

                        <List>
                            <ListItem onClick={() => { exportModel('.rdf'); this.handleCloseExport(); }} primaryText="rdf/xml" />
                            <ListItem onClick={() => { exportModel('.jsonld'); this.handleCloseExport(); }} primaryText="json-ld" />
                            <ListItem onClick={() => { exportModel('.ttl'); this.handleCloseExport(); }} primaryText="turtle" />
                        </List>
                    </Dialog>

                    <Dialog  // Dialog for help
                        title="Help"
                        actions={actionsHelp}
                        modal={false}
                        open={this.state.openHelp}
                        onRequestClose={this.handleCloseHelp}
                        autoScrollBodyContent
                    >
                        <Paper style={style} >
                            <Menu desktop width={512} >
                                <Subheader style={subHeaderStyle}>Buttons</Subheader>
                                <Divider />
                                    <MenuItem primaryText="Save" secondaryText="Save the Current Model" />
                                    <MenuItem primaryText="Save as" secondaryText="Save Created Model with a New Id" />
                                    <MenuItem primaryText="Load" secondaryText="Load Previously Saved Model" />
                                    <MenuItem primaryText="Export" secondaryText="Export Model" />
                                    <MenuItem primaryText="Import" secondaryText="Import Model" />
                                    <MenuItem primaryText="Bind" secondaryText="Bind Model" />
                                    <MenuItem primaryText="Clear" secondaryText="Clear Drop Zone" />
                                    <Subheader style={subHeaderStyle}>Mouse Commands</Subheader>
                                <Divider />
                                    <MenuItem primaryText="Create Component/Device" secondaryText="Drag a Componente or Device From The 'Palette' To Grid Zone" />
                                    <MenuItem primaryText="Create Subdevice" secondaryText="Drag Subdevice Onto Other Device" />
                                    <MenuItem primaryText="Select Component/Device" secondaryText="Click On Device" />
                                    <MenuItem primaryText="Unselect Device" secondaryText="Click Outside Of Device" />
                                <Divider />
                                    <Subheader style={subHeaderStyle}>Key Commands</Subheader>
                                <Divider />
                                <MenuItem primaryText="Unselect Component/Device" secondaryText="ESC" />
                                <MenuItem primaryText="Delete Component/Device" secondaryText="DEL" />
                                <MenuItem primaryText="Show Ids" secondaryText="ALT" />
                                <MenuItem primaryText="Commit Dialog" secondaryText="Enter" />
                                <MenuItem primaryText="Close Dialog" secondaryText="ESC" />
                            </Menu>
                        </Paper>
                    </Dialog>
                    <input id="import-model" type="file" name="name" style={{ display: 'none' }} onChange={readSingleFile} />
                    <a id="export-model" href="" style={{ display: 'none' }} download />
                </div>
            </MuiThemeProvider>
        );
    }
}
