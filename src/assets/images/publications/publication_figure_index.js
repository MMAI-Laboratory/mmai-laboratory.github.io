import AUTO_FIGURE_INDEX from "./figures/auto/index.json";
import STYLE_KD_FIGURE_1 from "./figures/style-kd-figure-1.webp";
import SPATIAL_BIAS_FIGURE_1 from "./figures/spatial-bias-figure-1.webp";
import ADNET_FIGURE_2 from "./figures/adnet-figure-2.webp";
import CNN_VIT_MEDICAL_FIGURE_1 from "./figures/cnn-vit-medical-figure-1.webp";
import CT_ASBO_FIGURE_2 from "./figures/ct-asbo-figure-2.webp";
import RAL_FIGURE_2 from "./figures/ral-figure-2.webp";
import DO_YOUR_BEST_FIGURE_1 from "./figures/do-your-best-figure-1.webp";
import CHANNEL_PROPAGATION_FIGURE_1 from "./figures/channel-propagation-figure-1.webp";
import MAP_FIGURE_1 from "./figures/map-figure-1.webp";
import NEURAL_SUBSTITUTION_FIGURE_1 from "./figures/neural-substitution-figure-1.webp";
import HQT_FIGURE_1 from "./figures/hqt-figure-1.webp";
import GEN_SSL_FIGURE_2 from "./figures/gen-ssl-figure-2.webp";
import CXR_LT_FIGURE_1 from "./figures/cxr-lt-figure-1.webp";
import FG_SSL_FIGURE_1 from "./figures/fg-ssl-figure-1.webp";
import TRAIN_OVERCOMPLETE_FIGURE_1 from "./figures/train-overcomplete-figure-1.webp";
import LAYER_WISE_CURRICULUM_FIGURE_1 from "./figures/layer-wise-curriculum-figure-1.webp";
import COLLA_Q_FIGURE_1 from "./figures/colla-q-figure-1.webp";
import RECALIBRATED_CONTRASTIVE_FIGURE_1 from "./figures/recalibrated-contrastive-figure-1.webp";
import PNEUMOTHORAX_CONTRAST_FIGURE_2 from "./figures/pneumothorax-contrast-figure-2.webp";
import OMNIMVS_UNCERTAINTY_FIGURE_1 from "./figures/omnimvs-uncertainty-figure-1.webp";
import DUAL_AGGREGATED_FPN_FIGURE_1 from "./figures/dual-aggregated-fpn-figure-1.webp";
import SELF_TUNING_FIGURE_1 from "./figures/self-tuning-figure-1.webp";
import INTUSSUSCEPTION_FIGURE_3 from "./figures/intussusception-figure-3.webp";
import FLOWVLA_FIGURE_1 from "./figures/flowvla-figure-1.webp";
import ONE_CYCLE_BATTERY_RUL_FIGURE_1 from "./figures/one-cycle-battery-rul-figure-1.webp";
import GRAMIAN_ATTENTION_FIGURE_2 from "./figures/gramian-attention-figure-2.webp";
import EFFICIENT_TTC_FIGURE_1 from "./figures/efficient-ttc-figure-1.webp";
import DIFFERENTIABLE_BIT_WIDTHS_FIGURE_1 from "./figures/differentiable-bit-widths-figure-1.webp";
import OMNIMVS_FIGURE_1 from "./figures/omnimvs-figure-1.webp";
import SWEEPNET_FIGURE_4 from "./figures/sweepnet-figure-4.webp";
import DFT_POOLING_FIGURE_1 from "./figures/dft-pooling-figure-1.webp";
import GCFN_FIGURE_OVERVIEW from "./figures/gcfn-figure-overview.webp";
import FACE_DOMAIN_TRANSFER_FIGURE_OVERVIEW from "./figures/face-domain-transfer-figure-overview.webp";
import ALZHEIMERS_RANK_POOLING_FIGURE_OVERVIEW from "./figures/alzheimers-rank-pooling-figure-overview.webp";

const PUBLICATION_FIGURES = {
    "biomedical-bapub4-style-kd-class-imbalanced-medical-image": {
        image: STYLE_KD_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 from Style-KD showing source and reference retinal images used to balance the APTOS2019 training set.",
        sourceUrl:
            "https://ars.els-cdn.com/content/image/1-s2.0-S1746809423013617-gr1_lrg.jpg",
    },
    "core-capub0-spatial-bias-for-attention-free-non-local": {
        image: SPATIAL_BIAS_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 from Spatial Bias comparing inference time and top-1 accuracy across non-local network variants.",
        sourceUrl:
            "https://ars.els-cdn.com/content/image/1-s2.0-S0957417423025551-gr1_lrg.jpg",
    },
    "biomedical-bapub2-attentional-decoder-networks-for-chest-x-r": {
        image: ADNET_FIGURE_2,
        figureLabel: "Figure 2",
        alt: "Figure 2 from ADNet comparing a conventional U-Net decoder with the proposed attentional decoder and harmonic magnitude transform.",
        sourceUrl:
            "https://ars.els-cdn.com/content/image/1-s2.0-S0169260724001949-gr2_lrg.jpg",
    },
    "biomedical-bapub3-analyzing-to-discover-origins-of-cnns-and": {
        image: CNN_VIT_MEDICAL_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 from the CNN and ViT analysis paper showing robustness results and corrupted medical image examples.",
        sourceUrl:
            "https://media.springernature.com/full/springer-static/image/art%3A10.1038%2Fs41598-024-58382-3/MediaObjects/41598_2024_58382_Fig1_HTML.png",
    },
    "biomedical-bapub0-deep-learning-using-computed-tomography-to": {
        image: CT_ASBO_FIGURE_2,
        figureLabel: "Figure 2",
        alt: "Figure 2 from the acute small bowel obstruction study showing the proposed CT diagnosis network workflow.",
        sourceUrl:
            "https://cdn.ncbi.nlm.nih.gov/pmc/blobs/72af/10720875/e4ac39b2182c/js9-109-4091-g002.jpg",
    },
    "biomedical-bapub1-robust-asymmetric-loss-for-multi-label-lon": {
        image: RAL_FIGURE_2,
        figureLabel: "Figure 2",
        alt: "Figure 2 from the RAL paper comparing BCE, ASL, and robust asymmetric loss probabilities on multi-label and single-label medical images.",
        sourceUrl:
            "https://openaccess.thecvf.com/content/ICCV2023W/CVAMD/papers/Park_Robust_Asymmetric_Loss_for_Multi-Label_Long-Tailed_Learning_ICCVW_2023_paper.pdf",
    },
    "core-capub1-do-your-best-and-get-enough-rest-for-continual": {
        image: DO_YOUR_BEST_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 from the Respacing paper illustrating the forgetting curve and how recall interval affects memory retention decay.",
        sourceUrl: "https://arxiv.org/abs/2503.18371",
    },
    "core-capub2-channel-propagation-networks-for-refreshable": {
        image: CHANNEL_PROPAGATION_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 comparing Channel Propagation networks (CP-Swin, CP-PiT) with baseline Swin and PiT across parameter count and top-1 accuracy.",
        sourceUrl:
            "https://openaccess.thecvf.com/content/WACV2025/papers/Go_Channel_Propagation_Networks_for_Refreshable_Vision_Transformer_WACV_2025_paper.pdf",
    },
    "core-capub3-enriching-local-patterns-with-multi-token": {
        image: MAP_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 comparing MAP-ConvNeXt and MAP-MaxViT against SOTA networks on throughput versus top-1 accuracy for small and large models.",
        sourceUrl:
            "https://openaccess.thecvf.com/content/WACV2025/papers/Kang_Enriching_Local_Patterns_with_Multi-Token_Attention_for_Broad-Sight_Neural_Networks_WACV_2025_paper.pdf",
    },
    "core-capub4-neural-substitution-for-branch-level-network": {
        image: NEURAL_SUBSTITUTION_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 illustrating the progression from block-level to branch-level connectivity in the re-parameterization network.",
        sourceUrl:
            "https://openaccess.thecvf.com/content/ACCV2024/papers/Oh_Neural_Substitution_for_Branch-level_Network_Re-parameterization_ACCV_2024_paper.pdf",
    },
    "core-capub5-unsupervised-hashing-network-with-hyper": {
        image: HQT_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 comparing clustering results of a traditional hashing algorithm with the proposed Hyper Quantization Tree, plus the HQT training pipeline.",
        sourceUrl: "https://bmva-archive.org.uk/bmvc/2024/papers/Paper_482/paper.pdf",
    },
    "biomedical-bapub5-generative-self-supervised-learning-for": {
        image: GEN_SSL_FIGURE_2,
        figureLabel: "Figure 2",
        alt: "Figure 2 showing the generative self-supervised learning pipeline: LLM-elaborated prompts, diffusion-based image generation, and AdaIN-based reconstruction.",
        sourceUrl:
            "https://openaccess.thecvf.com/content/ACCV2024/html/Park_Generative_Self-Supervised_Learning_for_Medical_Image_Classification_ACCV_2024_paper.html",
    },
    "biomedical-bapub6-towards-long-tailed-multi-label-disease": {
        image: CXR_LT_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 showing the long-tailed distribution of clinical findings in the CXR-LT 2023 challenge dataset, highlighting newly added versus original labels.",
        sourceUrl: "https://arxiv.org/abs/2310.16112",
    },
    "biomedical-bapub7-fine-grained-self-supervised-learning-with": {
        image: FG_SSL_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 showing the FG-SSL architecture with shuffled and distorted image branches feeding a shared hierarchical block toward a Barlow Twins style cross-correlation loss.",
        sourceUrl: "https://www.sciencedirect.com/science/article/abs/pii/S0010482524005444",
    },
    "llm-2026-train-overcomplete-deploy-compact": {
        image: TRAIN_OVERCOMPLETE_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 comparing LoRA, which keeps pruned layers frozen with low-rank adapters, against the proposed OverRep method, which trains an overcomplete parameterization that is re-parameterized into a compact form at deployment.",
        sourceUrl: "",
    },
    "llm-2026-layer-wise-curriculum-learning": {
        image: LAYER_WISE_CURRICULUM_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 comparing a baseline that optimizes all student layers at once, causing cumulative error to grow with depth, against the proposed easy-to-hard layer-wise curriculum that passes curriculum features between layers to keep cumulative error low.",
        sourceUrl: "",
    },
    "llm-2026-colla-q-moe-quantization": {
        image: COLLA_Q_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 comparing a baseline MoE quantization ensemble that mixes a poorly performing expert into the router's output against Colla-Q, which selects and ensembles collaborative experts for a better aggregated result.",
        sourceUrl: "",
    },
    "core-2026-recalibrated-contrastive-loss-vlm": {
        image: RECALIBRATED_CONTRASTIVE_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 illustrating learnable text prompts and an augmented contrastive space built from image and text encoders over transformed image-text pairs, with adaptive re-calibration reweighting the contrastive loss targets.",
        sourceUrl: "",
    },
    "biomedical-2023-contrast-level-pneumothorax-detection": {
        image: PNEUMOTHORAX_CONTRAST_FIGURE_2,
        figureLabel: "Figure 2",
        alt: "Figure 2 showing the study pipeline: a DICOM input image is contrast-converted by setting window width and level, optionally converted to JPEG, then classified by a ResNet-50 backbone into pneumothorax or normal.",
        sourceUrl:
            "https://pmc.ncbi.nlm.nih.gov/articles/PMC10287877/figure/Fig2/",
    },
    "core-2021-omnidirectional-stereo-matching": {
        image: OMNIMVS_UNCERTAINTY_FIGURE_1,
        figureLabel: "Example results",
        alt: "Example results showing four wide-angle fisheye camera inputs on the left and, on the right, the reconstructed panorama with its estimated inverse depth map and uncertainty map.",
        sourceUrl: "https://github.com/hyu-cvlab/omnimvs-pytorch",
    },
    "core-2021-dual-aggregated-feature-pyramid-network": {
        image: DUAL_AGGREGATED_FPN_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 illustrating the dual aggregation design: multi-scale activation maps are down-channeled and combined in a dense aggregation layer for feature level aggregation, then passed to class-wise classifiers whose positive scores are aggregated at the classifier level.",
        sourceUrl:
            "https://ars.els-cdn.com/content/image/1-s2.0-S016786552100026X-gr1_lrg.jpg",
    },
    "core-2021-unsupervised-feature-learning-self-tuning": {
        image: SELF_TUNING_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 showing the self-tuning pipeline: a mini-batch with an anchor is encoded by a convolutional network, grouped by bagged clustering, ranked by clustering and distance to reveal violations, and used to form triplets.",
        sourceUrl:
            "https://ars.els-cdn.com/content/image/1-s2.0-S089360802030366X-gr1_lrg.jpg",
    },
    "core-2023-gramian-attention-heads": {
        image: GRAMIAN_ATTENTION_FIGURE_2,
        figureLabel: "Figure 2",
        alt: "Figure 2 showing the proposed learning method: a backbone feeds N lightweight heads whose features are pulled toward the target by cross-entropy loss while a decorrelation loss pushes them apart from an anchor point, yielding less-correlated clusters after training.",
        sourceUrl:
            "https://openaccess.thecvf.com/content/ICCV2023/papers/Ryu_Gramian_Attention_Heads_are_Strong_yet_Efficient_Vision_Learners_ICCV_2023_paper.pdf",
    },
    "robot-2026-flowvla-pluggable-3d-flow-learning": {
        image: FLOWVLA_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 showing FlowVLA: multimodal RGB, language, and proprioception inputs feed a VLA transformer backbone that decodes actions, with training-only dual-level supervision from reference-anchored 3D point trajectories at point and TCP flow levels.",
        sourceUrl: "",
    },
    "biomedical-2026-one-cycle-battery-rul-prediction": {
        image: ONE_CYCLE_BATTERY_RUL_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 showing the pipeline: charge and discharge curves from a single cycle are transformed by a continuous wavelet transform, compressed across scales to remove redundancy, and fed to a deep neural network that predicts the remaining useful life capacity curve.",
        sourceUrl: "",
    },
    "biomedical-2020-intussusception-detection-radiography": {
        image: INTUSSUSCEPTION_FIGURE_3,
        figureLabel: "Figure 3",
        alt: "Figure 3 showing pairs of paediatric abdominal radiographs and their class activation maps, where the heatmap overlay highlights the region the model used to detect intussusception.",
        sourceUrl:
            "https://pmc.ncbi.nlm.nih.gov/articles/PMC7567788/figure/Fig3/",
    },
    "core-2026-efficient-ttc-candidate-verification": {
        image: EFFICIENT_TTC_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 from Efficient Test-time Adaptation illustrating candidate verification and divergence-shift based test-time adaptation.",
        sourceUrl: "",
    },
    "llm-2026-differentiable-bit-widths-svd": {
        image: DIFFERENTIABLE_BIT_WIDTHS_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 from Differentiable Bit-Widths: (a) sequential optimization prunes FP16 weights and then quantizes them, while (b) DBW co-optimizes both in one step by learning per-component bit-widths.",
        sourceUrl: "https://arxiv.org/abs/2610.06026",
    },
    "core-2019-omnimvs-omnidirectional-stereo-matching": {
        image: OMNIMVS_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 from OmniMVS: four fisheye input images pass through a shared 2D CNN, the unary features are warped onto spheres by spherical sweeping, and a 3D encoder-decoder with softargmin turns the cost volume into an omnidirectional depth map.",
        sourceUrl:
            "https://openaccess.thecvf.com/content_ICCV_2019/papers/Won_OmniMVS_End-to-End_Learning_for_Omnidirectional_Stereo_Matching_ICCV_2019_paper.pdf",
    },
    "core-2019-sweepnet-omnidirectional-depth-estimation": {
        image: SWEEPNET_FIGURE_4,
        figureLabel: "Figure 4",
        alt: "Figure 4 from SweepNet: pairs of fisheye images are warped onto each virtual sphere, SweepNet computes pairwise matching costs, and the averaged cost volume is refined by cost aggregation before the depth is taken by argmin.",
        sourceUrl: "https://arxiv.org/pdf/1902.10904",
    },
    "core-2018-dft-transformation-invariant-pooling": {
        image: DFT_POOLING_FIGURE_1,
        figureLabel: "Figure 1",
        alt: "Figure 1 from the DFT pooling paper comparing feature maps at the last CNN layers: conventional layouts without and with average pooling, and the proposed DFT magnitude pooling that keeps low-frequency DFT coefficients.",
        sourceUrl:
            "https://openaccess.thecvf.com/content_ECCV_2018/papers/Jongbin_Ryu_DFT-based_Transformation_Invariant_ECCV_2018_paper.pdf",
    },
    "core-2020-generalized-convolutional-forest-networks": {
        image: GCFN_FIGURE_OVERVIEW,
        figureLabel: "Overview",
        alt: "Overview of Generalized Convolutional Forest Networks: CNN features feed random forests, whose probability mass function guides triplet sampling of anchor, positive and negative examples, and the triplet loss updates the CNN.",
        sourceUrl: "https://openreview.net/pdf?id=H1lxVyStPH",
    },
    "core-2020-unsupervised-face-domain-transfer": {
        image: FACE_DOMAIN_TRANSFER_FIGURE_OVERVIEW,
        figureLabel: "Overview",
        alt: "Overview of unsupervised face domain transfer: generative face augmentation adds high-to-low resolution samples across poses, and spatial resolution adaptation then clusters high- and low-resolution faces of the same identity together.",
        sourceUrl: "https://ieeexplore.ieee.org/document/8945345",
    },
    "biomedical-2026-alzheimers-robust-rank-pooling": {
        image: ALZHEIMERS_RANK_POOLING_FIGURE_OVERVIEW,
        figureLabel: "Overview",
        alt: "Overview of robust rank pooling: sliding windows over a 3D brain MRI volume are each compressed into a single image, and a selection procedure picks a robust combination of the compressed images for Alzheimer's disease classification.",
        sourceUrl: "https://www.nature.com/articles/s41598-026-74059-5",
    },
};

// Figures fetched by the publication sheet sync for papers that have no
// hand-picked one above (scripts/content/publication_figures.py). A
// hand-picked entry always wins.
const AUTO_FIGURE_IMAGES = import.meta.glob("./figures/auto/*.webp", {
    eager: true,
    import: "default",
});

const getAutoFigure = (publicationId) => {
    const entry = AUTO_FIGURE_INDEX[publicationId];
    const image = AUTO_FIGURE_IMAGES[`./figures/auto/${publicationId}.webp`];
    if (entry?.status !== "ok" || !image) {
        return null;
    }
    return {
        image,
        figureLabel: entry.figureLabel || "Figure 1",
        alt: entry.alt || "Figure 1",
        sourceUrl: entry.sourceUrl || "",
    };
};

export const getPublicationFigure = (publicationId = "") =>
    PUBLICATION_FIGURES[publicationId] ?? getAutoFigure(publicationId);

export default PUBLICATION_FIGURES;
