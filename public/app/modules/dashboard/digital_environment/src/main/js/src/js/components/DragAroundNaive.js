import React, { Component } from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import DropContainer from './DropContainer';
import ComponentDetailList from './ComponentDetailList';
import NavigationBar from './NavigationBar';
import PaletteContainer from './PaletteContainer';

class DragAroundNaive extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hideSourceOnDrag: false
        };
    }

    state = { // It should be placed after the constructor
        open: false,
    };

    handleToggle = () => {
        this.setState({
            open: !this.state.open,
        });
    };

    handleNestedListToggle = (item) => {
        this.setState({
            open: item.state.open,
        });
    };

    render() {
        const { hideSourceOnDrag } = this.state;
        return (
            <div className="container-fluid" style={{ height: '100%' }}>
                <div className="row">
                    <div className="col-sm-12">
                        <NavigationBar className="" />
                    </div>
                </div>

                <div className="row" style={{ height: 20 }} />
                <div className="row" style={{ height: window.innerHeight * 0.8 }}>
                    <div id="palette-container" className="col-sm-3 col-lg-2" style={{ height: '100%' }}>
                        <PaletteContainer hideSourceOnDrag={hideSourceOnDrag} />
                    </div>
                    <div className="col-sm-6 col-lg-7" style={{ height: '100%' }}>
                        <DropContainer hideSourceOnDrag={!hideSourceOnDrag} />
                    </div>
                    <div className="col-sm-3 col-lg-3" style={{ height: '100%' }}>
                        <ComponentDetailList />
                    </div>
                </div>
            </div>
        );
    }
}

export default DragDropContext(HTML5Backend)(DragAroundNaive);
