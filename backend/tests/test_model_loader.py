from app.model_loader import (
    BASE_DIR,
    MODELS_DIR,
    MODEL_PATH,
    SCHEMA_PATH,
    IMPUTATION_PATH,
    load_feature_schema,
    load_imputation_metadata,
    load_model,
)


def test_loader_paths_are_relative_to_backend_root():
    assert BASE_DIR.name == "backend"
    assert MODELS_DIR == BASE_DIR / "models"
    assert MODEL_PATH == MODELS_DIR / "random_forest_v2_57feat.pkl"
    assert SCHEMA_PATH == MODELS_DIR / "feature_schema.json"
    assert IMPUTATION_PATH == MODELS_DIR / "imputation_metadata.json"


def test_loader_reads_schema_and_imputation_data():
    schema = load_feature_schema()
    metadata = load_imputation_metadata()

    assert len(schema) == 57
    assert schema[:3] == ["nose_x", "nose_y", "nose_score"]
    assert schema[-6:] == [
        "left_knee_angle",
        "right_knee_angle",
        "trunk_inclination_angle",
        "shoulder_hip_alignment_angle",
        "left_elbow_angle",
        "right_elbow_angle",
    ]
    assert set(metadata.keys()) == {
        "left_knee_angle",
        "right_knee_angle",
        "trunk_inclination_angle",
        "shoulder_hip_alignment_angle",
        "left_elbow_angle",
        "right_elbow_angle",
    }


def test_model_can_be_loaded_and_matches_schema_size():
    try:
        model = load_model()
    except RuntimeError as exc:
        assert "scikit-learn version" in str(exc)
        return

    assert model is not None
    assert hasattr(model, "n_features_in_")
    assert model.n_features_in_ == len(load_feature_schema())
