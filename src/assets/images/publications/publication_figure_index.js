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
    "biomedical-2020-intussusception-detection-radiography": {
        image: INTUSSUSCEPTION_FIGURE_3,
        figureLabel: "Figure 3",
        alt: "Figure 3 showing pairs of paediatric abdominal radiographs and their class activation maps, where the heatmap overlay highlights the region the model used to detect intussusception.",
        sourceUrl:
            "https://pmc.ncbi.nlm.nih.gov/articles/PMC7567788/figure/Fig3/",
    },
};

export const getPublicationFigure = (publicationId = "") =>
    PUBLICATION_FIGURES[publicationId] ?? null;

export default PUBLICATION_FIGURES;
