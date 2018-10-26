import React, { Component } from "react";
import Editor from "./Editor";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { isProduction, PUBLIC_URL, API_URL, ACCESS_TOKEN } from "../config.js";

import SearchBar from "./SearchBar";
import "../css/selector.css";

import bones from "../library/bones.json";
import libraryUtils from '../utils/libraryUtils';

const RenderPremium = ({ premium }) => {
	if (premium) {
		return (
			<div className="abs premium">
				<FontAwesomeIcon
					className="abs centered white big-icon"
					icon="dollar-sign"
				/>
			</div>
		);
	} else {
		return null;
	}
}

const RenderLink = ({ link }) => {
	if (link) {
		return (
			<a className="abs link" href={link}>
				<FontAwesomeIcon
					className="abs centered white icon"
					icon="link"
				/>
			</a>
		);
	} else {
		return null;
	}
}

class Selector extends Component {
	constructor(props) {
		super(props);

		const { currentCategory, isLeft } = props;
		const loadedLibraryData = libraryUtils.getLibrary(currentCategory, isLeft);

		this.state = {
			editorSelected: false,
			pose: undefined,
			searchText: "",
			loadedLibraryData,
		};
	}

	async componentDidMount() {
		// Load the base model with defaultMeshes and defaultPose
		const { data: pose } = await axios.get("models/poses/default.json");

		// await new Promise(resolve => setTimeout(resolve, 3000)); // wait 3 secs
		this.setState({	pose });

		window.loadDefaultMeshes(bones, pose);
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.currentCategory !== this.props.currentCategory ||
			nextProps.isLeft !== this.props.isLeft) {
			const { currentCategory, isLeft } = nextProps;

			const loadedLibraryData = libraryUtils.getLibrary(currentCategory, isLeft);

			this.setState({ loadedLibraryData });
		}
	}
	
	applyPose(file) {
		let poseData;
		//Ajax in react
		axios.get("models/poses/" + file + ".json").then(res => {
			poseData = res.data;
			this.setState({ pose: poseData });
			window.loadPose(poseData, bones);
		});
	}

	handleSearch = searchText => {
		this.setState({ searchText });
	};
	
	handleLoadMore = async e => {
		const bodyPart = this.props.currentCategory;
		const params = {
			q: "", // could be undefined
			tags: ["customizer", `customizer-${bodyPart}`], // search for specific tags
			access_token: !isProduction ? ACCESS_TOKEN : undefined // if not in production, needs access token
		};

		const { data } = await axios.get(`${API_URL}/search`, { params });
		console.log(data);

		const { total_count, items } = data;

		/**
		 * TODO 
		 * 	- remove .slice
		 * 	- refactor reduce
		 */
		const itemsToAdd = (isProduction? items : items.slice(0, 10)).reduce((soFar, item) => {
			const {
				name,
				url: mmfLink,
				description,
				designer,
				images,
				files,
				licences
			} = item;

			// find first file associated with this object that ends with .glb
			// if none is found, step over this object
			const glbFile = files.items.find(f => f.filename.endsWith('.glb'));
			if(!glbFile){
				return soFar;
			}
			
			const primaryImg = images.find(image => image.is_primary);
			const author = designer.name;
			const rotation = undefined;
			const scale = 1;

			const newItem = {
				name,
				img: primaryImg.thumbnail.url,
				file: glbFile.filename,
				author,
				description,
				rotation,
				scale,
				mmfLink,
				absoluteURL: glbFile.download_url
			};

			// console.log(newItem);

			soFar.push(newItem);
			return soFar;
		}, []);

		this.setState({
			loadedLibraryData: [...this.state.loadedLibraryData, ...itemsToAdd]
		});

	}

	handleClick(libraryItem, category, isLeft, event) {
		if (libraryItem.premium) {
			this.props.updatePopupMessage(
				"Sorry this is a premium object, this feature is still in development..."
			);
			this.props.updatePopup(true);
		} else {
			if (category === "pose") {
				this.applyPose(libraryItem.file);
			} else if (category === "stand") {
				window.changeStand(libraryItem.file);
			} else {
				this.props.updateLoading(true);

				const meshType = libraryUtils.getMeshType(category, isLeft);
				const file = libraryItem.file;
				window.changeMesh(
					category,
					libraryItem,
					isLeft,
					this.state.pose,
					libraryItem.absoluteURL
				);
				let loadedMeshes = this.props.loadedMeshes;
				loadedMeshes[meshType] = file;
				this.props.updateMeshes(loadedMeshes);
			}
		}
	}

	render() {
		// Passing through the state from the properties
		const category = this.props.currentCategory;
		const isLeft = this.props.isLeft;

		const sideIdencator = libraryUtils.hasLeftAndRightDistinction(category);

		let filteredlibrary = this.state.loadedLibraryData.filter(element => (
			element.name.toLowerCase().indexOf(this.state.searchText) !== -1
		));


		//JSX element to display the HTML
		const elementDiv = filteredlibrary.map((libraryItem, i) => (
			<div
				className="el"
				key={i}
				onClick={this.handleClick.bind(this, libraryItem, category, isLeft)} // bind some variables
			>
				<div className="img">
					<img
						src={libraryItem.img}
						alt={libraryItem.img}
					/>
				</div>
				<div className="unselectable el-name">
					{libraryItem.name}
				</div>
				<RenderPremium premium = { libraryItem.premium } />
				<RenderLink link = { libraryItem.link } />
			</div>
		));

		// add "Add your designs" button
		elementDiv.push(
			<div
				className="el"
				key="add"
				onClick={() => {
					this.props.updatePopup(true);
					this.props.updatePopupMessage(
						"Sorry this feature is still in development..."
					);
				}}
			>
				<div className="img">
					<img
						src="img/library/plus.svg"
						alt="plus sign"
					/>
				</div>
				<div className="unselectable el-name">Add your designs</div>
			</div>
		);

		// add "LoadMore" button
		elementDiv.push(
			<div
				className = "el"
				key = "loadMore"
				onClick={this.handleLoadMore}
			>
				Load More
			</div>
		);

		const buttons = (
			<div className="abs switch">
				<div
					className={
						"unselectable abs left side L " +
						(isLeft ? "side-selected" : "")
					}
					onClick={() => {
						this.props.updateLeft(true);
						const meshType = libraryUtils.getMeshType(category, isLeft);
						if (meshType) {
							window.selectedMesh(meshType);
						}
					}}
				>
					Left
				</div>
				<div
					className={
						"unselectable abs right side R " +
						(isLeft ? "" : "side-selected")
					}
					onClick={() => {
						this.props.updateLeft(false);
						const meshType = libraryUtils.getMeshType(category, isLeft);
						if (meshType) {
							window.selectedMesh(meshType);
						}
					}}
				>
					Right
				</div>
			</div>
		);

		const editorButtons = (
			<div className="abs switch">
				<div
					className={
						"unselectable abs left side L " +
						(this.state.editorSelected ? "" : "side-selected")
					}
					onClick={() => {
						this.setState({ editorSelected: false });
					}}
				>
					Poses
				</div>
				<div
					className={
						"unselectable abs right side R " +
						(this.state.editorSelected ? "side-selected" : "")
					}
					onClick={() => {
						this.setState({ editorSelected: true });
					}}
				>
					Editor
				</div>
			</div>
		);

		return (
			<div>
				<div className="abs top right right-side">
					<div className="box">
						<SearchBar handleSearch={this.handleSearch} />
						{sideIdencator ? buttons : ""}
						{category === "pose" && this.props.editor ? editorButtons : ""}
						<div
							className={
								"abs top left " +
								(category === "pose" && this.state.editorSelected
									? " selector"
									: " selector") +
								(sideIdencator ||
								(category === "pose" && this.props.editor)
									? " selector-full"
									: " selector")
							}
						>
							{category === "pose" &&
								this.state.editorSelected &&
								this.props.editor ? (
									<Editor />
								) : (
									<div className="abs top left selector-nopadding">
										{elementDiv}
									</div>
								)}
							
						</div>
					</div>
				</div>
			</div>
		);
	}
}

export default Selector;
