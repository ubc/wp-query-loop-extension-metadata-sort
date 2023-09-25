const { createHigherOrderComponent } = wp.compose;
const { Fragment, useEffect, useState } = wp.element;
const { InspectorControls } = wp.blockEditor;
const { PanelBody, ToggleControl, PanelRow, TextControl, SelectControl } = wp.components;
const { union } = lodash;

/**
 * Add additional attributes to core/post-query block.
 */
function addAdditionalAttribute( settings, name ) {
    if ( 'core/query' !== name ) {
        return settings;
    }

    return {
        ...settings,
        attributes: {
            ...settings.attributes,
            metaSortEnabled: {
                type: 'boolean',
                default: false
            }
        }
    }
}

wp.hooks.addFilter(
    'blocks.registerBlockType',
    'query-block-extension/metadata/sort/add-attributes',
    addAdditionalAttribute
);

/**
 * Add additional controls to core/post-template block.
 */
const withInspectorControls = createHigherOrderComponent( ( BlockEdit ) => {

    return ( props ) => {
        const { name, attributes, setAttributes } = props;
        const { metaSortEnabled, query } = attributes;
        const [ metaKeys, setMetaKeys ] = useState([]);

        if( 'core/query' !== name ) {
            return <BlockEdit { ...props } />;
        }

        useEffect(() => {
            const metaKeys = async() => {
    
                const data = new FormData();
    
                data.append( 'action', 'metadata_sort_get_meta_keys' );
                data.append( 'nonce', wp_query_block_metadata_sort.nonce );
            
                const response = await fetch( ajaxurl, {
                  method: "POST",
                  credentials: 'same-origin',
                  body: data
                } );
                const responseJson = await response.json();
                
                if( responseJson.success ) {
                    setMetaKeys( responseJson.data );
                }
            };
    
            metaKeys();
        }, []);

        const disableMetaSort = () => {
            const { ['metaKey']: remove, ...rest } = query;
            setAttributes({
                metaSortEnabled: false,
                query: {
                    ...rest,
                    orderBy: 'date',
                    order: 'desc'
                }
            });
        }

        const enableMetaSort = () => {
            setAttributes({
                metaSortEnabled: true,
                query: {
                    ...query,
                    orderBy: 'meta_value',
                    order: 'desc',
                    metaKey: metaKeys[0]
                }
            });
        }

        useEffect(() => {
            // If user select one of the default query block orderBy value, then we disable meta sort.
            if ( ! query.orderBy.startsWith('meta_value') && metaSortEnabled ) {
                disableMetaSort();
            }
        }, [query.orderBy]);

        return (
            <Fragment>
                <BlockEdit { ...props } />
                <InspectorControls>
                    <PanelBody title="Metadata Sort" initialOpen={ false }>
                    { metaKeys.length > 0 ? (
                        <Fragment>
                            <ToggleControl
                            label="Enable Metadata Sort"
                            checked={ metaSortEnabled }
                            onChange={ newMetaSortEnabled => {
                                if( newMetaSortEnabled ) {
                                    enableMetaSort();
                                } else {
                                    disableMetaSort();
                                }
                            } }
                        />
                        { metaSortEnabled ? (
                            <Fragment>
                                <SelectControl
                                    label="Meta Type"
                                    value={ query.metaType ? query.metaType : 'CHAR' }
                                    options={ [
                                        { label: 'Char', value: 'CHAR' },
                                        { label: 'Numeric', value: 'NUMERIC' },
                                        { label: 'Binary', value: 'BINARY' },
                                        { label: 'Date', value: 'DATE' },
                                        { label: 'DateTime', value: 'DATETIME' },
                                        { label: 'Decimal', value: 'DECIMAL' },
                                        { label: 'Signed', value: 'SIGNED' },
                                        { label: 'Time', value: 'TIME' },
                                        { label: 'Unsigned', value: 'UNSIGNED' }
                                    ] }
                                    onChange={ ( newType ) => {
                                        setAttributes({
                                            query: {
                                                ...query,
                                                metaType: newType,
                                            }
                                        });
                                    } }
                                />
                                <SelectControl
                                    label="Order"
                                    value={ query.order }
                                    options={ [
                                        { label: 'DESC', value: 'desc' },
                                        { label: 'ASC', value: 'asc' }
                                    ] }
                                    onChange={ ( newOrder ) => {
                                        setAttributes({
                                            query: {
                                                ...query,
                                                order: newOrder
                                            }
                                        });
                                    } }
                                />
                                <SelectControl
                                    label="Meta Key"
                                    value={ query.metaKey }
                                    options={ metaKeys.map(key => {
                                        return {
                                            label: key,
                                            value: key
                                        };
                                    }) }
                                    onChange={ ( newMetaKey ) => {
                                        setAttributes({
                                            query: {
                                                ...query,
                                                metaKey: newMetaKey
                                            }
                                        });
                                    } }
                                    __nextHasNoMarginBottom
                                />
                            </Fragment>
                        ) : null }
                        </Fragment>
                    ) : (
                            <p>No post meta key detected on your site</p>
                        )
                    }
                    </PanelBody>
                </InspectorControls>
            </Fragment>
        );
    };
}, 'withInspectorControl' );

wp.hooks.addFilter(
    'editor.BlockEdit',
    'query-block-extension/metadata/sort/add-controls',
    withInspectorControls
);