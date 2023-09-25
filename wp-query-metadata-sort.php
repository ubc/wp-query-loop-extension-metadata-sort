<?php
/**
 *
 * Plugin Name:       WP Query Block Extension - Metadata Sort
 * Description:       Add metadata support to Query Loop Block Sort.
 * Version:           1.0
 * Author:            Kelvin Xu
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       wp-query-block-extension
 *
 * @package ubc_query_block_extension
 */

namespace UBC\CTLT\BLOCKS\QUERY_BLOCK\METADATA\SORT;

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	die;
}

add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_assets' );

/**
 * Enqueue block assets.
 *
 * @return void
 */
function enqueue_assets() {

	wp_enqueue_script(
		'wp-query-block-metadata-sort-js',
		plugin_dir_url( __FILE__ ) . 'build/script.js',
		array(),
		filemtime( plugin_dir_path( __FILE__ ) . 'build/script.js' ),
		true
	);

	wp_localize_script(
		'wp-query-block-metadata-sort-js',
		'wp_query_block_metadata_sort',
		array(
			'nonce' => wp_create_nonce( 'metadata_sort_ajax' ),
		)
	);

}//end enqueue_assets()

add_filter( 'rest_post_query', __NAMESPACE__ . '\\sort_post_by_metadata', 10, 2 );
add_filter( 'rest_page_query', __NAMESPACE__ . '\\sort_post_by_metadata', 10, 2 );

/**
 * Add query args to post and page rest endpoint.
 *
 * @param  array           $args Array of arguments for WP_Query.
 * @param  WP_REST_Request $request The REST API request.
 * @return array
 */
function sort_post_by_metadata( $args, $request ) {
	if ( ! isset( $request['metaKey'] ) ) {
		return $args;
	}

	// Secure the meta sort to same host ONLY.
	if ( $request->get_headers()['host'][0] !== $_SERVER['HTTP_HOST'] ) {
		return $args;
	}

	$args['meta_key'] = sanitize_text_field( $request['metaKey'] );

	return $args;
}//end sort_post_by_metadata()

add_filter( 'rest_post_collection_params', __NAMESPACE__ . '\\add_rest_orderby_params', 10, 1 );
add_filter( 'rest_page_collection_params', __NAMESPACE__ . '\\add_rest_orderby_params', 10, 1 );

/**
 * Add meta_value to the list of permitted orderby values
 *
 * @param array $params WP Query parameters.
 * @return array
 */
function add_rest_orderby_params( $params ) {

	$params['orderby']['enum'][] = 'meta_value';

	return $params;
}

add_filter( 'query_loop_block_query_vars', __NAMESPACE__ . '\\update_query_args', 10, 3 );

/**
 * Update query args for blocks that inherits the main query loop block.
 *
 * @param  array    $query Array containing parameters for WP_Query as parsed by the block context.
 * @param  WP_Block $block Block instance.
 * @param  int      $page Current query's page.
 * @return array
 */
function update_query_args( $query, $block, $page ) {
	if ( isset( $block->context['query']['metaKey'] ) ) {
		$query['meta_key'] = sanitize_text_field( $block->context['query']['metaKey'] );
	}

	if ( isset( $block->context['query']['metaType'] ) ) {
		$query['meta_type'] = sanitize_text_field( $block->context['query']['metaType'] );
	}

	return $query;
}

add_action( 'wp_ajax_metadata_sort_get_meta_keys', __NAMESPACE__ . '\\get_meta_keys' );

/**
 * Ajax request handler to return the list of meta keys from the post meta table.
 *
 * @return void
 */
function get_meta_keys() {
	global $wpdb;

	wp_verify_nonce( $_POST['nonce'], 'metadata_sort_ajax' );

	$keys = get_transient( 'wp_metadata_get_keys' );
	if ( false !== $keys ) {
		wp_send_json_success( $keys );
	}

	$keys = $wpdb->get_col(
		$wpdb->prepare(
			"SELECT DISTINCT meta_key
			FROM $wpdb->postmeta
			WHERE meta_key NOT BETWEEN '_' AND '_z'
			HAVING meta_key NOT LIKE %s
			ORDER BY meta_key",
			$wpdb->esc_like( '_' ) . '%'
		)
	);

	set_transient( 'wp_metadata_get_keys', $keys, HOUR_IN_SECONDS );

	wp_send_json_success( $keys );
}//end get_meta_keys()

add_action( 'updated_post_meta', __NAMESPACE__ . '\\reset_metakeys_transient' );

/**
 * Delete `wp_metadata_filter_get_keys` transient when any of the post metas is updated.
 */
function reset_metakeys_transient() {
	if ( false !== get_transient( 'wp_metadata_get_keys' ) ) {
		delete_transient( 'wp_metadata_get_keys' );
	}
}//end reset_metakeys_transient()
