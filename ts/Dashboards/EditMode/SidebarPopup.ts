/* *
 *
 *  (c) 2009-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  Pawel Lysy
 *
 * */

'use strict';

/* *
 *
 *  Imports
 *
 * */
import type Cell from '../Layout/Cell';
import type ComponentType from '../Components/ComponentType';
import type EditMode from './EditMode';
import type Row from '../Layout/Row';

import AccordionMenu from './AccordionMenu.js';
import BaseForm from '../../Shared/BaseForm.js';
import Bindings from '../Actions/Bindings.js';
import EditGlobals from './EditGlobals.js';
import EditRenderer from './EditRenderer.js';
import GUIElement from '../Layout/GUIElement.js';
import Layout from '../Layout/Layout.js';
import U from '../../Core/Utilities.js';
const {
    addEvent,
    createElement,
    merge
} = U;

/* *
 *
 *  Class
 *
 * */

/**
 * Class which creates the sidebar and handles its behavior.
 *
 * @internal
 */
class SidebarPopup extends BaseForm {

    public static readonly addLayout = {
        text: 'layout',
        onDrop: function (
            sidebar: SidebarPopup,
            dropContext: Cell|Row
        ): Cell|void {

            if (!dropContext) {
                return;
            }

            const row = (
                    dropContext.getType() === 'cell' ?
                        (dropContext as Cell).row :
                        (dropContext as Row)
                ),
                board = row.layout.board,
                newLayoutName = GUIElement.createElementId('layout'),
                cellName = GUIElement.createElementId('cell'),
                layout = new Layout(board, {
                    id: newLayoutName,
                    copyId: '',
                    parentContainerId: board.container.id,
                    rows: [{
                        cells: [{
                            id: cellName
                        }]
                    }],
                    style: {}
                });

            if (layout) {
                board.layouts.push(layout);
            }

            Bindings.addComponent({
                type: 'HTML',
                cell: cellName,
                elements: [
                    {
                        tagName: 'div',
                        textContent: 'Placeholder text'
                    }
                ]
            });

        }
    };

    /* *
     *
     *  Constructor
     *
     * */

    /**
     * Constructor of the SidebarPopup class.
     *
     * @param parentDiv
     * Element to which the sidebar will be appended.
     *
     * @param iconsURL
     * URL to the icons.
     *
     * @param editMode
     * Instance of EditMode.
     */
    constructor(
        parentDiv: HTMLElement,
        iconsURL: string,
        editMode: EditMode
    ) {
        super(parentDiv, iconsURL);

        this.editMode = editMode;

        this.options = merge(
            this.options,
            editMode.options.toolbars?.sidebar || {}
        );

        this.componentsList = this.getComponentsList(
            this.options.components || []
        );

        this.accordionMenu = new AccordionMenu(
            this.iconsURL,
            this.hide.bind(this)
        );
    }

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Reference to the AccordionMenu.
     */
    public accordionMenu: AccordionMenu;

    /**
     * Instance of EditMode.
     */
    public editMode: EditMode;

    /**
     * Options used in the sidebar.
     */
    public options: SidebarPopup.Options = {
        components: ['HTML', 'layout', 'Highcharts', 'DataGrid', 'KPI']
    };

    /**
     * Whether the sidebar is visible.
     */
    public isVisible = false;

    /**
     * List of components that can be added to the board.
     */
    private componentsList: Array<SidebarPopup.AddComponentDetails> = [];

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Function to detect on which side of the screen should the sidebar be.
     *
     * @param context
     * The cell or row which is the context of the sidebar.
     *
     * @returns
     * Whether the sidebar should be on the right side of the screen.
     */
    private detectRightSidebar(context: Cell | Row): boolean {
        const editMode = this.editMode;
        const layoutWrapper = editMode.board.layoutsWrapper;

        return GUIElement.getOffsets(
            context as Cell,
            layoutWrapper
        ).left < ((layoutWrapper.offsetWidth / 2) - 10); // 10 = snap

    }

    /**
     * Function to remove the class names from the sidebar.
     */
    private removeClassNames(): void {
        const classNames = EditGlobals.classNames,
            classList = this.container.classList;

        classList.remove(classNames.editSidebarShow);
        classList.remove(classNames.editSidebarRightShow);
    }

    /**
     * Function to add the class names to the sidebar depending on the position
     * of the sidebar.
     *
     * @param isRightSidebar
     * Whether the sidebar should be on the right side of the screen.
     */
    private addClassNames(isRightSidebar: boolean): void {
        const classList = this.container.classList;

        if (isRightSidebar) {
            classList.add(
                EditGlobals.classNames.editSidebarRight
            );
        } else {
            classList.remove(
                EditGlobals.classNames.editSidebarRight
            );
        }

        setTimeout(():void => {
            classList.add(EditGlobals.classNames[
                isRightSidebar ? 'editSidebarRightShow' : 'editSidebarShow'
            ]
            );
        });
    }

    /**
     * Function to show the sidebar.
     *
     * @param context
     * The cell or row which is the context of the sidebar.
     */
    public show(context?: Cell | Row): void {
        const editMode = this.editMode,
            isRightSidebar = !!(context && this.detectRightSidebar(context));

        this.showPopup(EditGlobals.classNames.editSidebarShow);
        this.addClassNames(isRightSidebar);

        if (editMode.resizer) {
            editMode.resizer.disableResizer();
        }

        // Remove highlight from the row.
        if (editMode.editCellContext && editMode.editCellContext.row) {
            editMode.editCellContext.row.setHighlight(true);
        }

        editMode.hideToolbars(['cell', 'row']);
        editMode.stopContextDetection();

        this.isVisible = true;

        this.generateContent(context);
    }

    public generateContent(context?: Cell | Row): void {

        // Title
        this.renderHeader(
            context ?
                this.editMode.lang.settings :
                this.editMode.lang.addComponent,
            ''
        );

        if (!context) {
            this.renderAddComponentsList();
            return;
        }

        const type = context.getType();

        if (type === 'cell') {
            const component = (context as Cell).mountedComponent;
            if (!component) {
                return;
            }
            this.accordionMenu.renderContent(this.container, component);
        }
    }

    public renderAddComponentsList(): void {
        const sidebar = this;
        const components = this.componentsList;
        let gridElement;

        const gridWrapper = createElement('div', {
            className: EditGlobals.classNames.editGridItems
        }, {}, sidebar.container);

        for (let i = 0, iEnd = components.length; i < iEnd; ++i) {
            gridElement = createElement(
                'div',
                {},
                {},
                gridWrapper
            );

            // Drag drop new component.
            gridElement.addEventListener('mousedown', (e: Event): void => {
                if (sidebar.editMode.dragDrop) {

                    const onMouseLeave = (): void => {
                        sidebar.hide();
                    };

                    sidebar.container.addEventListener(
                        'mouseleave',
                        onMouseLeave
                    );

                    sidebar.editMode.dragDrop.onDragStart(
                        e as PointerEvent,
                        void 0,
                        (dropContext: Cell|Row): void => {
                            // Add component if there is no layout yet.
                            if (this.editMode.board.layouts.length === 0) {
                                const board = this.editMode.board,
                                    newLayoutName =
                                        GUIElement.createElementId('layout'),
                                    layout = new Layout(board, {
                                        id: newLayoutName,
                                        copyId: '',
                                        parentContainerId: board.container.id,
                                        rows: [{}],
                                        style: {}
                                    });
                                if (layout) {
                                    board.layouts.push(layout);
                                }

                                dropContext = layout.rows[0];
                            }

                            const newCell =
                                components[i].onDrop(sidebar, dropContext);

                            if (newCell) {
                                const mountedComponent =
                                    newCell.mountedComponent;
                                // skip init connector when is not defined by
                                // options f.e HTML component.
                                if (mountedComponent.options?.connector?.id) {
                                    mountedComponent.initConnector();
                                }
                                sidebar.editMode.setEditCellContext(newCell);
                                sidebar.show(newCell);
                                newCell.setHighlight();
                            }
                            sidebar.container.removeEventListener(
                                'mouseleave',
                                onMouseLeave
                            );
                        }
                    );
                }
            });
            gridElement.innerHTML = components[i].text;
        }
        return;
    }

    public onDropNewComponent(
        dropContext: Cell|Row,
        componentOptions: Partial<ComponentType['options']>
    ): Cell | void {
        const sidebar = this,
            dragDrop = sidebar.editMode.dragDrop;

        if (dragDrop) {
            const row = (
                    dropContext.getType() === 'cell' ?
                        (dropContext as Cell).row :
                        (dropContext as Row)
                ),
                newCell = row.addCell({
                    id: GUIElement.createElementId('col')
                });

            dragDrop.onCellDragEnd(newCell);
            const options = merge(componentOptions, {
                cell: newCell.id
            });
            Bindings.addComponent(options, newCell);
            sidebar.editMode.setEditOverlay();

            return newCell;
        }
    }

    /**
     * Function to hide the sidebar.
     */
    public hide(): void {
        const editMode = this.editMode;
        const editCellContext = editMode.editCellContext;

        this.removeClassNames();

        // Remove edit overlay if active.
        if (editMode.isEditOverlayActive) {
            editMode.setEditOverlay(true);
        }

        if (editCellContext && editCellContext.row) {
            editMode.showToolbars(['cell', 'row'], editCellContext);
            editCellContext.row.setHighlight();

            // Remove cell highlight if active.
            if (editCellContext.isHighlighted) {
                editCellContext.setHighlight(true);
            }
        }

        editMode.isContextDetectionActive = true;
        this.isVisible = false;
    }

    /**
     * Function called when the close button is pressed.
     */
    public closeButtonEvents(): void {
        this.hide();
    }

    public renderHeader(title: string, iconURL: string): void {
        const icon = EditRenderer.renderIcon(this.container, {
            icon: iconURL,
            className: EditGlobals.classNames.editSidebarTitle
        });

        if (icon) {
            icon.textContent = title;
        }
    }

    /**
     * Based on the provided components list, it returns the list of components
     * with its names and functions that are called when the component is
     * dropped.
     *
     * @param components
     * List of components that can be added to the board.
     */
    private getComponentsList(
        components: Array<string>
    ): Array<SidebarPopup.AddComponentDetails> {
        const sidebar = this,
            editMode = sidebar.editMode,
            componentTypes = editMode.board.componentTypes,
            componentList: Array<SidebarPopup.AddComponentDetails> = [];

        components.forEach((componentName: string): void => {
            const component = componentTypes[
                componentName as keyof typeof componentTypes
            ];

            if (component) {
                componentList.push({
                    text: editMode.lang?.sidebar[componentName] ||
                        component.name,
                    onDrop: function (
                        sidebar: SidebarPopup,
                        dropContext: Cell|Row
                    ): Cell|void {
                        const options =
                            component.prototype.getOptionsOnDrop(sidebar);

                        if (options) {
                            return sidebar.onDropNewComponent(
                                dropContext,
                                options
                            );
                        }
                    }
                });
            } else if (componentName === 'layout') {
                componentList.push(SidebarPopup.addLayout);
            }
        });

        return componentList;
    }

    /**
     * Function to create and add the close button to the sidebar.
     *
     * @param className
     * Class name of the close button.
     * @returns Close button element
     */
    protected addCloseButton(
        className: string = EditGlobals.classNames.popupCloseButton
    ): HTMLElement {
        // close popup when click outside the popup
        addEvent(document, 'click', (event): void => {
            event.stopPropagation();
            if (
                this.container.style.display === 'block' &&
                !this.container.contains(event.target) &&
                this.container.classList.value.includes('show')
            ) {
                this.hide();
            }
        });

        return super.addCloseButton.call(this, className);
    }

    /**
     * Function that creates the container of the sidebar.
     *
     * @param parentDiv
     * The parent div to which the sidebar will be appended.
     * @param className
     * Class name of the sidebar.
     * @returns The container of the sidebar.
     */
    protected createPopupContainer(
        parentDiv: HTMLElement,
        className = EditGlobals.classNames.editSidebar
    ): HTMLElement {
        return super.createPopupContainer.call(this, parentDiv, className);
    }
}

/* *
 *
 *  Namespace
 *
 * */
namespace SidebarPopup {

    /**
     * Options used to configure the sidebar.
     */
    export interface Options {
        components?: Array<string>;
    }

    /**
     * Contains the name of the component and the function that is called when
     * the component is dropped.
     */
    export interface AddComponentDetails {
        text: string;
        onDrop: Function;
    }
}
/* *
 *
 *  Default Export
 *
 * */

export default SidebarPopup;
