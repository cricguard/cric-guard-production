import numpy as np

from app.model_loader import FEATURE_SCHEMA, TRAINING_MEDIANS

KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle"
]

CONF_THRESHOLD = 0.20

def calculate_angle_3pt(p1, p2, p3, s1, s2, s3):
    if min(s1, s2, s3) < CONF_THRESHOLD:
        return np.nan
    u = np.array([p1[0] - p2[0], p1[1] - p2[1]])
    v = np.array([p3[0] - p2[0], p3[1] - p2[1]])
    norm_u, norm_v = np.linalg.norm(u), np.linalg.norm(v)
    if norm_u < 1e-6 or norm_v < 1e-6:
        return np.nan
    cos_theta = np.clip(np.dot(u, v) / (norm_u * norm_v), -1.0, 1.0)
    return np.degrees(np.arccos(cos_theta))

def calculate_trunk_inclination(sh_mid, hip_mid, min_score):
    if min_score < CONF_THRESHOLD:
        return np.nan
    s = np.array([sh_mid[0] - hip_mid[0], sh_mid[1] - hip_mid[1]])
    v_vert = np.array([0.0, -1.0])
    norm_s = np.linalg.norm(s)
    if norm_s < 1e-6:
        return np.nan
    cos_theta = np.clip(np.dot(s, v_vert) / norm_s, -1.0, 1.0)
    return np.degrees(np.arccos(cos_theta))

def calculate_shoulder_hip_alignment(l_sh, r_sh, l_hip, r_hip, min_score):
    if min_score < CONF_THRESHOLD:
        return np.nan
    v_sh = np.array([r_sh[0] - l_sh[0], r_sh[1] - l_sh[1]])
    v_hip = np.array([r_hip[0] - l_hip[0], r_hip[1] - l_hip[1]])
    norm_sh, norm_hip = np.linalg.norm(v_sh), np.linalg.norm(v_hip)
    if norm_sh < 1e-6 or norm_hip < 1e-6:
        return np.nan
    cos_theta = np.clip(abs(np.dot(v_sh, v_hip)) / (norm_sh * norm_hip), -1.0, 1.0)
    return np.degrees(np.arccos(cos_theta))

def build_57_feature_vector(keypoints_17x3):
    """
    keypoints_17x3: numpy array of shape (17, 3) where each row is [y, x, score]
    """
    kp_dict = {}
    for idx, name in enumerate(KEYPOINT_NAMES):
        y, x, score = keypoints_17x3[idx]
        kp_dict[name] = {"x": float(x), "y": float(y), "score": float(score)}

    # Helper getters
    def pt(name): return (kp_dict[name]["x"], kp_dict[name]["y"])
    def score(name): return kp_dict[name]["score"]

    # 1. 51 Raw Features
    raw_51 = {}
    for name in KEYPOINT_NAMES:
        raw_51[f"{name}_x"] = kp_dict[name]["x"]
        raw_51[f"{name}_y"] = kp_dict[name]["y"]
        raw_51[f"{name}_score"] = kp_dict[name]["score"]

    # 2. 6 Biomechanical Features
    lk_ang = calculate_angle_3pt(pt("left_hip"), pt("left_knee"), pt("left_ankle"), score("left_hip"), score("left_knee"), score("left_ankle"))
    rk_ang = calculate_angle_3pt(pt("right_hip"), pt("right_knee"), pt("right_ankle"), score("right_hip"), score("right_knee"), score("right_ankle"))

    sh_mid = ((pt("left_shoulder")[0] + pt("right_shoulder")[0])/2, (pt("left_shoulder")[1] + pt("right_shoulder")[1])/2)
    hip_mid = ((pt("left_hip")[0] + pt("right_hip")[0])/2, (pt("left_hip")[1] + pt("right_hip")[1])/2)
    trunk_min_conf = min(score("left_shoulder"), score("right_shoulder"), score("left_hip"), score("right_hip"))
    tr_ang = calculate_trunk_inclination(sh_mid, hip_mid, trunk_min_conf)

    sh_hip_ang = calculate_shoulder_hip_alignment(pt("left_shoulder"), pt("right_shoulder"), pt("left_hip"), pt("right_hip"), trunk_min_conf)

    le_ang = calculate_angle_3pt(pt("left_shoulder"), pt("left_elbow"), pt("left_wrist"), score("left_shoulder"), score("left_elbow"), score("left_wrist"))
    re_ang = calculate_angle_3pt(pt("right_shoulder"), pt("right_elbow"), pt("right_wrist"), score("right_shoulder"), score("right_elbow"), score("right_wrist"))

    bio_6 = {
        "left_knee_angle": lk_ang,
        "right_knee_angle": rk_ang,
        "trunk_inclination_angle": tr_ang,
        "shoulder_hip_alignment_angle": sh_hip_ang,
        "left_elbow_angle": le_ang,
        "right_elbow_angle": re_ang
    }

    # Impute NaNs with fixed training medians
    for k, v in bio_6.items():
        if np.isnan(v):
            bio_6[k] = TRAINING_MEDIANS[k]

    # Combine into schema order
    all_features = {**raw_51, **bio_6}
    feature_vector = [all_features[col] for col in FEATURE_SCHEMA]
    return np.array(feature_vector).reshape(1, -1)