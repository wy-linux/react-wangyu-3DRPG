import Character from "../character";
import RayCasterInteraction from "../interaction";
import {   
    PerspectiveCamera, 
    Scene, 
    Group, 
    Mesh, 
    AmbientLight,
    Fog,
    SRGBColorSpace,
    Texture,
    MeshBasicMaterial,
    Object3D
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { COLLISION_SCENE_URL, FRAMES, ON_LOAD_FINISH } from "../Constants";
import { MeshBVH, StaticGeometryGenerator, type MeshBVHOptions } from "three-mesh-bvh";
import Control from "../control";
import Loader from "../loader";
import Emitter from "../emitter";
import { type BVHGeometry, isMesh } from "../utils/typeAssert";

interface WorldParams {
	scene: Scene;
	camera: PerspectiveCamera;
	orbit_controls: OrbitControls;
	loader: Loader;
	emitter: Emitter;
}

export default class World {
	private readonly scene: Scene;
	private readonly camera: PerspectiveCamera;
	private readonly orbit_controls: OrbitControls;
	private readonly loader: Loader;
	private readonly emitter: Emitter;
    private readonly meshFrames: Record<string, Mesh> = {}
    private textureFrames: Texture[] = [];
	private collision_scene: Group | undefined;
    control: Control;
	collider: Mesh | undefined;
	is_load_finished = false;
	character: Character;
	RayCasterInteraction: RayCasterInteraction;
    interactiveMesh: Object3D[] = [];

	constructor({
		scene,
		camera,
		orbit_controls,
		loader,
		emitter
	}: WorldParams) {
		this.scene = scene;
		this.camera = camera;
		this.orbit_controls = orbit_controls;
		this.loader = loader;
		this.emitter = emitter;
        this.control = new Control({
            emitter: this.emitter
        })
		this.character = new Character({
			scene: this.scene,
			camera: this.camera,
			orbit_controls: this.orbit_controls,
			control: this.control,
			loader: this.loader,
			emitter: this.emitter
		})
		this.RayCasterInteraction = new RayCasterInteraction({
			scene: this.scene,
            camera: this.camera,
			emitter: this.emitter
		})
		this._loadEnvironment()
	}

	update(delta: number) {
		// 需等待场景加载完毕后更新character，避免初始加载时多余的性能消耗和人物碰撞错误处理
		if (this.is_load_finished && this.collider) {
			this.character.update(delta, this.collider);
		}
		// 需等待场景及人物加载完毕后更新交互探测，避免初始加载时多余的性能消耗
		if (this.is_load_finished) {
			this.RayCasterInteraction.updateRayCast(this.interactiveMesh);
		}
	}

    //加载场景、纹理、光照
	private async _loadEnvironment() {
		try {
			await this._loadCollisionScene();
            await this._loadTextureFrames()
            this._configureGallery()
			this._initSceneOtherEffects();
            this.RayCasterInteraction.bindClickRayCast(this.interactiveMesh)
			this.is_load_finished = true;
            this.emitter.$emit(ON_LOAD_FINISH);
		} catch (e) {
			console.log(e);
		}
	}

    //加载texture贴图
    private async _loadTextureFrames(): Promise<void> {
		for (let i = 0; i < FRAMES.length; i++) {
			this.textureFrames[i] = await this.loader.texture_loader.loadAsync(FRAMES[i].url);
            this.textureFrames[i].colorSpace = SRGBColorSpace;
		}
	}

    //配置frame贴图
	private _configureGallery() {
		for (let k = 0; k < this.textureFrames.length; k++) {
			const frame = this.meshFrames[`frame${k + 1}`];
			const frameMaterial = frame.material;
			(frameMaterial as MeshBasicMaterial).map = this.textureFrames[k];
            frame.userData = {
				name: frame.name,
				title: FRAMES[k].title,
				author: FRAMES[k].author,
				description: FRAMES[k].description,
                src: FRAMES[k].url,
				index: k,
			};
		}
	}

    //加载场景并绑定碰撞
	private _loadCollisionScene(): Promise<void> {
		return new Promise(resolve => {
			this.loader.gltf_loader.load(COLLISION_SCENE_URL, (gltf) => {
				this.collision_scene = gltf.scene;
				this.collision_scene.updateMatrixWorld(true);
				this.collision_scene.traverse(item => {
                    if(isMesh(item)) {
                        item.castShadow = true;
                        item.receiveShadow = true;
                        if(item.name.includes('frame')) {
                            this.meshFrames[item.name] = item
                            this.interactiveMesh.push(item)
                        }
                    }
				});
                //three-mesh-bvh绑定碰撞
				const static_generator = new StaticGeometryGenerator(this.collision_scene);
				static_generator.attributes = ["position"];
				const generate_geometry = static_generator.generate() as BVHGeometry;
				generate_geometry.boundsTree = new MeshBVH(generate_geometry, {lazyGeneration: false} as MeshBVHOptions);
				this.collider = new Mesh(generate_geometry);
				this.scene.add(this.collision_scene);
				resolve();
			});
		});
	}

	//创建环境灯光、场景雾
	private _initSceneOtherEffects() {
		this.scene.add(new AmbientLight(0xffffff, 5));
		this.scene.fog = new Fog(0xcccccc, 10, 900);
        //TODO 
	}
}
